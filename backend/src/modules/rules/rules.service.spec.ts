import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { RulesService } from './rules.service';
import { TournamentsService } from '../tournaments/tournaments.service';
import { Role, TournamentStatus } from '../../generated/prisma/enums';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '../../format-response/errors/error';

describe('RulesService', () => {
  let service: RulesService;
  let prisma: any;
  let tournaments: any;

  beforeEach(async () => {
    prisma = {
      client: {
        tournament: {
          findUnique: jest.fn(),
        },
        category: {
          findUnique: jest.fn(),
        },
        ruleDocument: {
          create: jest.fn(),
          findMany: jest.fn(),
          count: jest.fn(),
          findUnique: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
        auditLog: {
          create: jest.fn(),
        },
        $transaction: jest.fn((promises) => Promise.all(promises)),
      },
    };

    tournaments = {
      getOwnedTournament: jest.fn(),
      getById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RulesService,
        { provide: PrismaService, useValue: prisma },
        { provide: TournamentsService, useValue: tournaments },
      ],
    }).compile();

    service = module.get<RulesService>(RulesService);
  });

  describe('create', () => {
    it('tạo thể lệ chung (không có categoryId) thành công', async () => {
      tournaments.getOwnedTournament.mockResolvedValue({ id: 1, organizerId: 10 });
      prisma.client.ruleDocument.create.mockResolvedValue({
        id: 101,
        tournamentId: 1,
        categoryId: null,
        title: 'Điều lệ chung',
        fileUrl: 'https://example.com/rule.pdf',
      });

      const result = await service.create(1, 10, Role.BTC, {
        title: 'Điều lệ chung',
        fileUrl: 'https://example.com/rule.pdf',
      });

      expect(tournaments.getOwnedTournament).toHaveBeenCalledWith(1, 10);
      expect(prisma.client.ruleDocument.create).toHaveBeenCalledWith({
        data: {
          tournamentId: 1,
          categoryId: null,
          title: 'Điều lệ chung',
          fileUrl: 'https://example.com/rule.pdf',
          mimeType: undefined,
          checksum: undefined,
        },
        include: { category: { select: { id: true, name: true } } },
      });
      expect(prisma.client.auditLog.create).toHaveBeenCalled();
      expect(result.id).toBe(101);
    });

    it('tạo thể lệ riêng theo category thành công khi category thuộc tournament', async () => {
      tournaments.getOwnedTournament.mockResolvedValue({ id: 1, organizerId: 10 });
      prisma.client.category.findUnique.mockResolvedValue({ id: 5, tournamentId: 1 });
      prisma.client.ruleDocument.create.mockResolvedValue({
        id: 102,
        tournamentId: 1,
        categoryId: 5,
        title: 'Điều lệ LoL Nam',
        fileUrl: 'https://example.com/lol.pdf',
      });

      const result = await service.create(1, 10, Role.BTC, {
        title: 'Điều lệ LoL Nam',
        fileUrl: 'https://example.com/lol.pdf',
        categoryId: 5,
      });

      expect(prisma.client.category.findUnique).toHaveBeenCalledWith({ where: { id: 5 } });
      expect(result.categoryId).toBe(5);
    });

    it('ném lỗi BadRequestException nếu categoryId không thuộc tournament', async () => {
      tournaments.getOwnedTournament.mockResolvedValue({ id: 1, organizerId: 10 });
      prisma.client.category.findUnique.mockResolvedValue({ id: 9, tournamentId: 99 }); // Khác tournament

      await expect(
        service.create(1, 10, Role.BTC, {
          title: 'Điều lệ sai giải',
          fileUrl: 'https://example.com/err.pdf',
          categoryId: 9,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('ném lỗi ForbiddenException nếu user không sở hữu giải', async () => {
      tournaments.getOwnedTournament.mockRejectedValue(
        new ForbiddenException('Bạn không quản lý giải đấu này.'),
      );

      await expect(
        service.create(1, 999, Role.BTC, {
          title: 'Điều lệ',
          fileUrl: 'https://example.com/rule.pdf',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('list', () => {
    it('lấy danh sách thể lệ theo giải đấu thành công', async () => {
      tournaments.getById.mockResolvedValue({ id: 1 });
      prisma.client.ruleDocument.findMany.mockResolvedValue([
        { id: 101, title: 'Luật chung' },
      ]);
      prisma.client.ruleDocument.count.mockResolvedValue(1);

      const result = await service.list(1, { page: 1, limit: 10 });

      expect(tournaments.getById).toHaveBeenCalledWith(1, undefined);
      expect(result.items.length).toBe(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getById', () => {
    it('ném lỗi NotFoundException nếu tài liệu thể lệ không tồn tại', async () => {
      prisma.client.ruleDocument.findUnique.mockResolvedValue(null);

      await expect(service.getById(999)).rejects.toThrow(NotFoundException);
    });

    it('trả về tài liệu thể lệ nếu tìm thấy', async () => {
      prisma.client.ruleDocument.findUnique.mockResolvedValue({
        id: 1,
        title: 'Luật thi đấu',
        tournament: { id: 10, status: TournamentStatus.REGISTRATION_OPEN, organizerId: 2 },
      });

      const result = await service.getById(1);
      expect(result.id).toBe(1);
    });
  });

  describe('delete', () => {
    it('xóa tài liệu thể lệ thành công nếu sở hữu giải', async () => {
      prisma.client.ruleDocument.findUnique.mockResolvedValue({
        id: 1,
        tournamentId: 10,
      });
      tournaments.getOwnedTournament.mockResolvedValue({ id: 10, organizerId: 2 });
      prisma.client.ruleDocument.delete.mockResolvedValue({ id: 1 });

      const result = await service.delete(1, 2, Role.BTC);
      expect(result).toEqual({ id: 1 });
      expect(prisma.client.ruleDocument.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });
});
