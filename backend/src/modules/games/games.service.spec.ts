import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '../../format-response/errors/error';
import { GamesService } from './games.service';

describe('GamesService', () => {
  const prisma: any = {
    client: {
      game: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      category: { count: jest.fn() },
    },
  };
  const service = new GamesService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists only active games for the public catalog', async () => {
    prisma.client.game.findMany.mockResolvedValue([]);

    await service.list();

    expect(prisma.client.game.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true } }),
    );
  });

  it('maps duplicate game names or slugs to a conflict', async () => {
    prisma.client.game.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.create({ name: 'LoL', slug: 'lol' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects blank names and slugs in the business layer', async () => {
    await expect(
      service.create({ name: '   ', slug: 'lol' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create({ name: 'League of Legends', slug: '   ' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.client.game.create).not.toHaveBeenCalled();
  });

  it('prevents deactivation while categories reference the game', async () => {
    prisma.client.game.findFirst.mockResolvedValue({ id: 3 });
    prisma.client.category.count.mockResolvedValue(1);

    await expect(service.update(3, { isActive: false })).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.client.game.update).not.toHaveBeenCalled();
  });

  it('returns not found for a missing game', async () => {
    prisma.client.game.findFirst.mockResolvedValue(null);

    await expect(service.getById(3)).rejects.toBeInstanceOf(NotFoundException);
  });
});
