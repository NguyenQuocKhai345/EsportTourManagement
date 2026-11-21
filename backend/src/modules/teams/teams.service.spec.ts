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
  TournamentStatus,
  UserStatus,
} from '../../generated/prisma/enums';
import { TeamsService } from './teams.service';

describe('TeamsService', () => {
  const tx: any = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    category: { findUnique: jest.fn() },
    user: { findMany: jest.fn() },
    teamMember: { findMany: jest.fn() },
    team: { count: jest.fn(), create: jest.fn() },
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

  it('rejects a roster below the category minimum', async () => {
    await expect(
      service.create(3, actor, {
        ...input,
        memberPhones: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
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
      { id: 8, members: [{}, {}] },
    ]);
    prisma.client.team.count.mockResolvedValue(1);

    await expect(service.list(3, { page: 1, limit: 20 })).resolves.toEqual({
      items: [{ id: 8, members: [{}, {}], rosterCount: 2 }],
      total: 1,
      page: 1,
      limit: 20,
    });
  });

  it('returns team details with roster count', async () => {
    prisma.client.team.findUnique.mockResolvedValue({
      id: 8,
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
});
