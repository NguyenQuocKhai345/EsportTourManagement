import { CategoriesService } from './categories.service';
import { ParticipationType } from '../../generated/prisma/enums';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '../../format-response/errors/error';

describe('CategoriesService', () => {
  const tx: any = {
    category: {
      update: jest.fn().mockResolvedValue({ id: 5 }),
      findUnique: jest.fn().mockResolvedValue({ id: 5, eligibilityRules: [] }),
      delete: jest.fn().mockResolvedValue({ id: 5 }),
    },
    categoryEligibilityRule: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      createMany: jest.fn().mockResolvedValue({ count: 2 }),
    },
    stage: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    ruleDocument: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    tournament: {
      findUnique: jest.fn().mockResolvedValue({ status: 'DRAFT' }),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  };
  const prisma: any = {
    client: {
      category: {
        findFirst: jest.fn().mockResolvedValue({
          id: 5,
          participationType: 'TEAM',
          minPlayers: 2,
          maxPlayers: 5,
        }),
      },
      $transaction: jest.fn((callback: (transaction: any) => unknown) =>
        callback(tx),
      ),
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      team: { count: jest.fn().mockResolvedValue(0) },
    },
  };
  const tournaments: any = {
    getById: jest
      .fn()
      .mockResolvedValue({ id: 1, status: 'REGISTRATION_OPEN' }),
    getOwnedTournament: jest
      .fn()
      .mockResolvedValue({ status: 'REGISTRATION_OPEN' }),
    assertNoCategoryDependencies: jest.fn(),
    recordAudit: jest.fn(),
  };
  const service = new CategoriesService(prisma, tournaments);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.client.category.findFirst.mockResolvedValue({
      id: 5,
      participationType: 'TEAM',
      minPlayers: 2,
      maxPlayers: 5,
    });
    prisma.client.team.count.mockResolvedValue(0);
    tx.tournament.findUnique.mockResolvedValue({ status: 'DRAFT' });
    tournaments.getById.mockResolvedValue({
      id: 1,
      status: 'REGISTRATION_OPEN',
    });
    tournaments.getOwnedTournament.mockResolvedValue({
      status: 'REGISTRATION_OPEN',
    });
  });

  it('rejects SOLO categories unless both team sizes are exactly one', async () => {
    await expect(
      service.create(1, 2, {
        gameId: 3,
        name: 'Solo',
        participationType: ParticipationType.SOLO,
        minTeamSize: 1,
        maxTeamSize: 2,
        maxTeams: 8,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects TEAM categories where the minimum is greater than the maximum', async () => {
    await expect(
      service.create(1, 2, {
        gameId: 3,
        name: 'Team',
        participationType: ParticipationType.TEAM,
        minTeamSize: 5,
        maxTeamSize: 4,
        maxTeams: 8,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('replaces eligibility rules inside the category update transaction', async () => {
    await service.update(1, 5, 2, {
      eligibilityRules: ['Sinh viên đang học', 'Không bị cấm thi đấu'],
    });

    expect(prisma.client.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.categoryEligibilityRule.deleteMany).toHaveBeenCalledWith({
      where: { categoryId: 5 },
    });
    expect(tx.categoryEligibilityRule.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          categoryId: 5,
          description: 'Sinh viên đang học',
          sortOrder: 0,
        }),
        expect.objectContaining({
          categoryId: 5,
          description: 'Không bị cấm thi đấu',
          sortOrder: 1,
        }),
      ],
    });
  });

  it('returns 404 when the category does not belong to the tournament in the URL', async () => {
    prisma.client.category.findFirst.mockResolvedValueOnce(null);
    await expect(service.get(1, 5)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('blocks category edits when the tournament is completed', async () => {
    tournaments.getOwnedTournament.mockResolvedValueOnce({
      status: 'COMPLETED',
    });
    await expect(
      service.update(1, 5, 2, { name: 'Changed' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('blocks registration-affecting configuration after teams exist', async () => {
    prisma.client.team.count.mockResolvedValueOnce(1);
    await expect(
      service.update(1, 5, 2, { maxTeams: 12 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows deleting an empty category only while its tournament is a draft', async () => {
    await service.remove(1, 5, 2);
    expect(tx.categoryEligibilityRule.deleteMany).toHaveBeenCalledWith({
      where: { categoryId: 5 },
    });
    expect(tx.category.delete).toHaveBeenCalledWith({ where: { id: 5 } });
  });

  it('allows deleting an empty category during registration before player activity', async () => {
    tx.tournament.findUnique.mockResolvedValueOnce({
      status: 'REGISTRATION_OPEN',
    });
    await expect(service.remove(1, 5, 2)).resolves.toEqual({ id: 5 });
  });

  it('blocks deleting a category after its tournament leaves registration open', async () => {
    tx.tournament.findUnique.mockResolvedValueOnce({ status: 'IN_PROGRESS' });
    await expect(service.remove(1, 5, 2)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(tx.category.delete).not.toHaveBeenCalled();
  });
});
