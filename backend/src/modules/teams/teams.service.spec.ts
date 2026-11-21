import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '../../format-response/errors/error';
import {
  ParticipationType,
  Role,
  TeamMemberRole,
  TeamStatus,
  TournamentStatus,
  UserStatus,
} from '../../generated/prisma/enums';
import { TeamsService } from './teams.service';

describe('TeamsService', () => {
  const tx: any = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    category: { findUnique: jest.fn() },
    user: { findMany: jest.fn(), findUnique: jest.fn() },
    teamMember: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
    },
    team: {
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const prisma: any = {
    client: {
      $transaction: jest.fn((operation: any) =>
        typeof operation === 'function'
          ? operation(tx)
          : Promise.all(operation),
      ),
      category: { findUnique: jest.fn() },
      team: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn() },
    },
  };
  const service = new TeamsService(prisma);
  const actor = {
    id: 1,
    phone: '0900000001',
    role: Role.PLAYER,
    status: UserStatus.ACTIVE,
  };
  const input = {
    name: 'Team Alpha',
    memberPhones: ['0900000002'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    tx.category.findUnique.mockResolvedValue({
      id: 3,
      participationType: ParticipationType.TEAM,
      minPlayers: 2,
      maxPlayers: 5,
      maxTeams: 10,
      tournament: { status: TournamentStatus.REGISTRATION_OPEN },
    });
    tx.user.findMany.mockResolvedValue([
      {
        id: 2,
        phone: '0900000002',
        status: UserStatus.ACTIVE,
        role: Role.PLAYER,
      },
    ]);
    tx.teamMember.findMany.mockResolvedValue([]);
    tx.team.count.mockResolvedValue(0);
    tx.team.create.mockResolvedValue({ id: 8, members: [{}, {}] });
  });

  it('creates a team with its captain and initial roster transactionally', async () => {
    await service.create(3, actor, input);

    expect(prisma.client.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.team.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          categoryId: 3,
          captainId: 1,
          name: 'Team Alpha',
          status: TeamStatus.DRAFT,
          members: {
            create: [
              { userId: 1, role: TeamMemberRole.CAPTAIN },
              { userId: 2, role: TeamMemberRole.MEMBER },
            ],
          },
        }),
      }),
    );
    expect(tx.teamMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: { in: [1, 2] } }),
      }),
    );
  });

  it('rejects a missing category', async () => {
    tx.category.findUnique.mockResolvedValueOnce(null);
    await expect(service.create(3, actor, input)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects a category whose tournament is not accepting teams', async () => {
    tx.category.findUnique.mockResolvedValueOnce({
      id: 3,
      tournament: { status: TournamentStatus.IN_PROGRESS },
    });
    await expect(service.create(3, actor, input)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rejects callers who are not active players', async () => {
    await expect(
      service.create(3, { ...actor, role: Role.BTC }, input),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a player who already belongs to an active team in the category', async () => {
    tx.teamMember.findMany.mockResolvedValueOnce([{ userId: 2 }]);
    await expect(service.create(3, actor, input)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rejects nonexistent users', async () => {
    tx.user.findMany.mockResolvedValueOnce([]);
    await expect(service.create(3, actor, input)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects duplicate members', async () => {
    await expect(
      service.create(3, actor, {
        ...input,
        memberPhones: ['0900000002', '0900000002'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a roster over the category maximum', async () => {
    await expect(
      service.create(3, actor, {
        ...input,
        memberPhones: [
          '0900000002',
          '0900000003',
          '0900000004',
          '0900000005',
          '0900000006',
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows creating a TEAM with only its captain even if below category minimum', async () => {
    tx.user.findMany.mockResolvedValueOnce([]);
    tx.team.create.mockResolvedValueOnce({ id: 8, members: [{}] });

    const result = await service.create(3, actor, { name: 'Team Alpha' });

    expect(result.rosterCount).toBe(1);
    expect(tx.team.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          members: {
            create: [{ userId: actor.id, role: TeamMemberRole.CAPTAIN }],
          },
        }),
      }),
    );
  });

  it('requires exactly the captain for a SOLO category', async () => {
    tx.category.findUnique.mockResolvedValueOnce({
      id: 3,
      participationType: ParticipationType.SOLO,
      minPlayers: 1,
      maxPlayers: 1,
      maxTeams: 10,
      tournament: { status: TournamentStatus.REGISTRATION_OPEN },
    });
    await expect(service.create(3, actor, input)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('creates a SOLO team with only the authenticated player when memberPhones is omitted', async () => {
    tx.category.findUnique.mockResolvedValueOnce({
      id: 3,
      participationType: ParticipationType.SOLO,
      minPlayers: 1,
      maxPlayers: 1,
      maxTeams: 10,
      tournament: { status: TournamentStatus.REGISTRATION_OPEN },
    });
    tx.user.findMany.mockResolvedValueOnce([]);
    tx.team.create.mockResolvedValueOnce({ id: 8, members: [{}] });

    await service.create(3, actor, { name: 'Solo Player' });

    expect(tx.team.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          captainId: actor.id,
          members: {
            create: [{ userId: actor.id, role: TeamMemberRole.CAPTAIN }],
          },
        }),
      }),
    );
  });

  it('lists teams with pagination and roster counts', async () => {
    prisma.client.category.findUnique.mockResolvedValue({
      id: 3,
      tournament: { status: TournamentStatus.REGISTRATION_OPEN },
    });
    prisma.client.team.findMany.mockResolvedValue([
      { id: 8, status: TeamStatus.ACCEPTED, members: [{}, {}] },
    ]);
    prisma.client.team.count.mockResolvedValue(1);

    await expect(service.list(3, { page: 1, limit: 20 })).resolves.toEqual({
      items: [
        {
          id: 8,
          status: TeamStatus.ACCEPTED,
          members: [{}, {}],
          rosterCount: 2,
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });
  });

  it('returns team details with roster count', async () => {
    prisma.client.team.findUnique.mockResolvedValue({
      id: 8,
      captainId: 1,
      status: TeamStatus.ACCEPTED,
      category: { tournament: { status: TournamentStatus.REGISTRATION_OPEN } },
      members: [{}, {}],
    });
    await expect(service.getById(8)).resolves.toMatchObject({
      id: 8,
      rosterCount: 2,
    });
  });

  it('hides teams in a draft tournament from unrelated users', async () => {
    prisma.client.team.findUnique.mockResolvedValue({
      id: 8,
      captainId: 8,
      status: TeamStatus.DRAFT,
      category: { id: 3, tournament: { status: TournamentStatus.DRAFT } },
      members: [],
    });
    prisma.client.category.findUnique.mockResolvedValue({
      id: 3,
      tournament: { status: TournamentStatus.DRAFT, organizerId: 9 },
    });
    await expect(service.getById(8, 1)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('lets the captain update common team information in DRAFT', async () => {
    tx.team.findUnique.mockResolvedValue({
      id: 8,
      captainId: actor.id,
      status: TeamStatus.DRAFT,
    });
    tx.team.update.mockResolvedValue({
      id: 8,
      members: [{}, {}],
      status: TeamStatus.DRAFT,
    });

    const result = await service.update(8, actor, {
      name: 'Updated Team',
      tag: 'UPD',
      logoUrl: 'https://example.com/logo.png',
    });

    expect(result.rosterCount).toBe(2);
    expect(tx.team.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 8 },
        data: {
          name: 'Updated Team',
          tag: 'UPD',
          logoUrl: 'https://example.com/logo.png',
        },
      }),
    );
    expect(tx.teamMember.updateMany).not.toHaveBeenCalled();
    expect(tx.teamMember.createMany).not.toHaveBeenCalled();
  });

  it('prevents editing a team after it leaves DRAFT', async () => {
    tx.team.findUnique.mockResolvedValueOnce({
      id: 8,
      categoryId: 3,
      captainId: actor.id,
      status: TeamStatus.PENDING,
    });

    await expect(
      service.update(8, actor, { name: 'Changed' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.team.update).not.toHaveBeenCalled();
  });

  it('forbids a non-captain player from editing a DRAFT team', async () => {
    tx.team.findUnique.mockResolvedValueOnce({
      id: 8,
      categoryId: 3,
      captainId: 2,
      status: TeamStatus.DRAFT,
    });

    await expect(
      service.update(8, actor, { name: 'Changed' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.team.update).not.toHaveBeenCalled();
  });

  it('adds a valid member to a TEAM draft', async () => {
    tx.team.findUnique
      .mockResolvedValueOnce({
        id: 8,
        categoryId: 3,
        captainId: actor.id,
        status: TeamStatus.DRAFT,
        category: {
          id: 3,
          participationType: ParticipationType.TEAM,
          maxPlayers: 3,
        },
      })
      .mockResolvedValueOnce({ id: 8, members: [{}, {}] });
    tx.teamMember.findMany.mockResolvedValueOnce([{ userId: actor.id }]);
    tx.user.findUnique.mockResolvedValueOnce({
      id: 2,
      status: UserStatus.ACTIVE,
      role: Role.PLAYER,
    });
    tx.teamMember.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    tx.teamMember.count.mockResolvedValueOnce(1);

    const result = await service.addMember(8, actor, { phone: '0900000002' });

    expect(result.rosterCount).toBe(2);
    expect(tx.teamMember.create).toHaveBeenCalledWith({
      data: { teamId: 8, userId: 2, role: TeamMemberRole.MEMBER },
    });
  });

  it('rejects adding a member when the roster has reached maxPlayers', async () => {
    tx.team.findUnique.mockResolvedValueOnce({
      id: 8,
      categoryId: 3,
      captainId: actor.id,
      status: TeamStatus.DRAFT,
      category: {
        id: 3,
        participationType: ParticipationType.TEAM,
        maxPlayers: 1,
      },
    });
    tx.teamMember.findMany.mockResolvedValueOnce([{ userId: actor.id }]);
    tx.user.findUnique.mockResolvedValueOnce({
      id: 2,
      status: UserStatus.ACTIVE,
      role: Role.PLAYER,
    });
    tx.teamMember.findFirst.mockResolvedValueOnce(null);
    tx.teamMember.count.mockResolvedValueOnce(1);

    await expect(
      service.addMember(8, actor, { phone: '0900000002' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.teamMember.create).not.toHaveBeenCalled();
  });

  it('rejects adding an unknown user', async () => {
    tx.team.findUnique.mockResolvedValueOnce({
      id: 8,
      categoryId: 3,
      captainId: actor.id,
      status: TeamStatus.DRAFT,
      category: {
        id: 3,
        participationType: ParticipationType.TEAM,
        maxPlayers: 3,
      },
    });
    tx.teamMember.findMany.mockResolvedValueOnce([{ userId: actor.id }]);
    tx.user.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.addMember(8, actor, { phone: '0900000002' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects adding a duplicate member or a player already in another team', async () => {
    tx.team.findUnique.mockResolvedValueOnce({
      id: 8,
      categoryId: 3,
      captainId: actor.id,
      status: TeamStatus.DRAFT,
      category: {
        id: 3,
        participationType: ParticipationType.TEAM,
        maxPlayers: 3,
      },
    });
    tx.teamMember.findMany.mockResolvedValueOnce([{ userId: actor.id }]);
    tx.user.findUnique.mockResolvedValueOnce({
      id: 2,
      status: UserStatus.ACTIVE,
      role: Role.PLAYER,
    });
    tx.teamMember.findFirst.mockResolvedValueOnce({ id: 20 });

    await expect(
      service.addMember(8, actor, { phone: '0900000002' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.teamMember.create).not.toHaveBeenCalled();
  });

  it('rejects adding members to a SOLO team', async () => {
    tx.team.findUnique.mockResolvedValueOnce({
      id: 8,
      categoryId: 3,
      captainId: actor.id,
      status: TeamStatus.DRAFT,
      category: {
        id: 3,
        participationType: ParticipationType.SOLO,
        maxPlayers: 1,
      },
    });
    tx.teamMember.findMany.mockResolvedValueOnce([{ userId: actor.id }]);

    await expect(
      service.addMember(8, actor, { phone: '0900000002' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.user.findUnique).not.toHaveBeenCalled();
  });

  it('forbids a non-captain from adding a roster member', async () => {
    tx.team.findUnique.mockResolvedValueOnce({
      id: 8,
      categoryId: 3,
      captainId: 2,
      status: TeamStatus.DRAFT,
      category: {
        id: 3,
        participationType: ParticipationType.TEAM,
        maxPlayers: 5,
      },
    });

    await expect(
      service.addMember(8, actor, { phone: '0900000003' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.teamMember.create).not.toHaveBeenCalled();
  });

  it('keeps add-member changes inside a transaction when persistence fails', async () => {
    tx.team.findUnique.mockResolvedValueOnce({
      id: 8,
      categoryId: 3,
      captainId: actor.id,
      status: TeamStatus.DRAFT,
      category: {
        id: 3,
        participationType: ParticipationType.TEAM,
        maxPlayers: 3,
      },
    });
    tx.teamMember.findMany.mockResolvedValueOnce([{ userId: actor.id }]);
    tx.user.findUnique.mockResolvedValueOnce({
      id: 2,
      status: UserStatus.ACTIVE,
      role: Role.PLAYER,
    });
    tx.teamMember.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    tx.teamMember.count.mockResolvedValueOnce(1);
    tx.teamMember.create.mockRejectedValueOnce(new Error('database failure'));

    await expect(
      service.addMember(8, actor, { phone: '0900000002' }),
    ).rejects.toThrow('database failure');

    expect(prisma.client.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.teamMember.create).toHaveBeenCalledTimes(1);
    expect(tx.team.findUnique).toHaveBeenCalledTimes(1);
  });

  it('removes a TEAM member when the resulting roster meets minPlayers', async () => {
    tx.team.findUnique
      .mockResolvedValueOnce({
        id: 8,
        categoryId: 3,
        captainId: actor.id,
        status: TeamStatus.DRAFT,
        category: {
          id: 3,
          participationType: ParticipationType.TEAM,
          minPlayers: 1,
          maxPlayers: 5,
        },
      })
      .mockResolvedValueOnce({ id: 8, members: [{}] });
    tx.teamMember.findMany.mockResolvedValueOnce([{ userId: actor.id }]);
    tx.user.findUnique.mockResolvedValueOnce({ id: 2 });
    tx.teamMember.findFirst.mockResolvedValueOnce({ id: 22 });
    tx.teamMember.updateMany.mockResolvedValueOnce({ count: 1 });
    tx.teamMember.count.mockResolvedValueOnce(2);

    const result = await service.removeMember(8, actor, '0900000002');

    expect(result.rosterCount).toBe(1);
    expect(tx.teamMember.updateMany).toHaveBeenCalledWith({
      where: { id: 22, leftAt: null },
      data: { leftAt: expect.any(Date) },
    });
  });

  it('rejects removing a member when the resulting roster would be below minPlayers', async () => {
    tx.team.findUnique.mockResolvedValueOnce({
      id: 8,
      categoryId: 3,
      captainId: actor.id,
      status: TeamStatus.DRAFT,
      category: {
        id: 3,
        participationType: ParticipationType.TEAM,
        minPlayers: 2,
        maxPlayers: 5,
      },
    });
    tx.teamMember.findMany.mockResolvedValueOnce([{ userId: actor.id }]);
    tx.user.findUnique.mockResolvedValueOnce({ id: 2 });
    tx.teamMember.findFirst.mockResolvedValueOnce({ id: 22 });
    tx.teamMember.count.mockResolvedValueOnce(2);

    await expect(
      service.removeMember(8, actor, '0900000002'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.teamMember.updateMany).not.toHaveBeenCalled();
  });

  it('does not allow removing the captain from the roster', async () => {
    tx.team.findUnique.mockResolvedValueOnce({
      id: 8,
      categoryId: 3,
      captainId: actor.id,
      status: TeamStatus.DRAFT,
      category: {
        id: 3,
        participationType: ParticipationType.TEAM,
        maxPlayers: 5,
      },
    });
    tx.teamMember.findMany.mockResolvedValueOnce([{ userId: actor.id }]);
    tx.user.findUnique.mockResolvedValueOnce({ id: actor.id });

    await expect(
      service.removeMember(8, actor, actor.phone),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.teamMember.updateMany).not.toHaveBeenCalled();
  });

  it('rejects removing the only member from a SOLO team', async () => {
    tx.team.findUnique.mockResolvedValueOnce({
      id: 8,
      categoryId: 3,
      captainId: actor.id,
      status: TeamStatus.DRAFT,
      category: {
        id: 3,
        participationType: ParticipationType.SOLO,
        maxPlayers: 1,
      },
    });
    tx.teamMember.findMany.mockResolvedValueOnce([{ userId: actor.id }]);

    await expect(
      service.removeMember(8, actor, actor.phone),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.user.findUnique).not.toHaveBeenCalled();
  });

  it('changes captain to an existing TEAM member atomically', async () => {
    tx.team.findUnique
      .mockResolvedValueOnce({
        id: 8,
        categoryId: 3,
        captainId: actor.id,
        status: TeamStatus.DRAFT,
        category: {
          id: 3,
          participationType: ParticipationType.TEAM,
          maxPlayers: 5,
        },
      })
      .mockResolvedValueOnce({ id: 8, captainId: 2, members: [{}, {}] });
    tx.teamMember.findMany.mockResolvedValueOnce([{ userId: actor.id }]);
    tx.user.findUnique.mockResolvedValueOnce({
      id: 2,
      status: UserStatus.ACTIVE,
      role: Role.PLAYER,
    });
    tx.teamMember.findFirst
      .mockResolvedValueOnce({ id: 22 })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 11 });

    const result = await service.changeCaptain(8, actor, {
      phone: '0900000002',
    });

    expect(result.captainId).toBe(2);
    expect(tx.teamMember.update).toHaveBeenNthCalledWith(1, {
      where: { id: 11 },
      data: { role: TeamMemberRole.MEMBER },
    });
    expect(tx.teamMember.update).toHaveBeenNthCalledWith(2, {
      where: { id: 22 },
      data: { role: TeamMemberRole.CAPTAIN },
    });
    expect(tx.team.update).toHaveBeenCalledWith({
      where: { id: 8 },
      data: { captainId: 2 },
    });
  });

  it('rejects assigning captain to a user outside the roster', async () => {
    tx.team.findUnique.mockResolvedValueOnce({
      id: 8,
      categoryId: 3,
      captainId: actor.id,
      status: TeamStatus.DRAFT,
      category: {
        id: 3,
        participationType: ParticipationType.TEAM,
        maxPlayers: 5,
      },
    });
    tx.teamMember.findMany.mockResolvedValueOnce([{ userId: actor.id }]);
    tx.user.findUnique.mockResolvedValueOnce({
      id: 2,
      status: UserStatus.ACTIVE,
      role: Role.PLAYER,
    });
    tx.teamMember.findFirst.mockResolvedValueOnce(null);

    await expect(
      service.changeCaptain(8, actor, { phone: '0900000002' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.teamMember.update).not.toHaveBeenCalled();
  });

  it('does not permit changing captain to another user on a SOLO team', async () => {
    tx.team.findUnique.mockResolvedValueOnce({
      id: 8,
      categoryId: 3,
      captainId: actor.id,
      status: TeamStatus.DRAFT,
      category: {
        id: 3,
        participationType: ParticipationType.SOLO,
        maxPlayers: 1,
      },
    });
    tx.teamMember.findMany.mockResolvedValueOnce([{ userId: actor.id }]);
    tx.user.findUnique.mockResolvedValueOnce({
      id: 2,
      status: UserStatus.ACTIVE,
      role: Role.PLAYER,
    });

    await expect(
      service.changeCaptain(8, actor, { phone: '0900000002' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.teamMember.update).not.toHaveBeenCalled();
  });

  it('does not update Team captainId when a captain role update fails', async () => {
    tx.team.findUnique.mockResolvedValueOnce({
      id: 8,
      categoryId: 3,
      captainId: actor.id,
      status: TeamStatus.DRAFT,
      category: {
        id: 3,
        participationType: ParticipationType.TEAM,
        maxPlayers: 5,
      },
    });
    tx.teamMember.findMany.mockResolvedValueOnce([{ userId: actor.id }]);
    tx.user.findUnique.mockResolvedValueOnce({
      id: 2,
      status: UserStatus.ACTIVE,
      role: Role.PLAYER,
    });
    tx.teamMember.findFirst
      .mockResolvedValueOnce({ id: 22 })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 11 });
    tx.teamMember.update
      .mockResolvedValueOnce({ id: 11 })
      .mockRejectedValueOnce(new Error('database failure'));

    await expect(
      service.changeCaptain(8, actor, { phone: '0900000002' }),
    ).rejects.toThrow('database failure');
    expect(tx.team.update).not.toHaveBeenCalled();
  });
});
