import { TournamentsService } from './tournaments.service';
import { TournamentStatus } from '../../generated/prisma/enums';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '../../format-response/errors/error';

describe('TournamentsService', () => {
  const prisma: any = { client: { tournament: {}, auditLog: {} } };
  const service = new TournamentsService(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('hides DRAFT tournaments from public readers and allows the organizer to read them', async () => {
    prisma.client.tournament.findUnique = jest.fn().mockResolvedValue({
      id: 10,
      organizerId: 2,
      status: TournamentStatus.DRAFT,
    });

    await expect(service.getById(10)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.getById(10, 2)).resolves.toMatchObject({ id: 10 });
  });

  it('requires the tournament start to be before its end', async () => {
    await expect(
      service.create(2, {
        name: 'Invalid dates',
        startsAt: '2026-11-12T12:00:00.000Z',
        endsAt: '2026-11-12T12:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects writes by a BTC who does not own the tournament', async () => {
    prisma.client.tournament.findUnique = jest
      .fn()
      .mockResolvedValue({ id: 10, organizerId: 2 });
    await expect(service.getOwnedTournament(10, 3)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('prevents changing the status of a completed tournament', async () => {
    prisma.client.tournament.findUnique = jest.fn().mockResolvedValue({
      id: 10,
      organizerId: 2,
      status: TournamentStatus.COMPLETED,
    });
    await expect(
      service.update(10, 2, { status: TournamentStatus.CANCELLED }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('blocks deletion when a category has player-created teams or registrations', async () => {
    const tx = {
      tournament: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 10, status: TournamentStatus.DRAFT }),
      },
      category: { findMany: jest.fn().mockResolvedValue([{ id: 20 }]) },
      team: { count: jest.fn().mockResolvedValue(1) },
      registration: { count: jest.fn().mockResolvedValue(0) },
      matchResultSubmission: { count: jest.fn().mockResolvedValue(0) },
      dispute: { count: jest.fn().mockResolvedValue(0) },
    };
    await expect(
      service.assertNoCategoryDependencies(tx, [20]),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('only allows deleting tournaments in DRAFT or REGISTRATION_OPEN', async () => {
    const tx = {
      tournament: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 10, status: TournamentStatus.IN_PROGRESS }),
      },
      category: { findMany: jest.fn() },
    };
    await expect(
      service.assertTournamentDeleteAllowed(tx, 10),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.category.findMany).not.toHaveBeenCalled();
  });
});
