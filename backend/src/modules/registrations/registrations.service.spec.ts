import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { RegistrationsService } from './registrations.service';
import { TournamentsService } from '../tournaments/tournaments.service';
import {
  RegistrationStatus,
  Role,
  TeamStatus,
  TournamentStatus,
} from '../../generated/prisma/enums';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '../../format-response/errors/error';

describe('RegistrationsService', () => {
  let service: RegistrationsService;
  let prisma: any;
  let tournaments: any;

  beforeEach(async () => {
    prisma = {
      client: {
        team: {
          findUnique: jest.fn(),
          update: jest.fn(),
          count: jest.fn(),
        },
        registration: {
          upsert: jest.fn(),
          findUnique: jest.fn(),
          findMany: jest.fn(),
          count: jest.fn(),
          update: jest.fn(),
        },
        tournament: {
          findUnique: jest.fn(),
        },
        auditLog: {
          create: jest.fn(),
        },
        $queryRaw: jest.fn().mockResolvedValue([]),
        $transaction: jest.fn((callback) => {
          if (typeof callback === 'function') {
            return callback(prisma.client);
          }
          return Promise.all(callback);
        }),
      },
    };

    tournaments = {
      getOwnedTournament: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: TournamentsService, useValue: tournaments },
      ],
    }).compile();

    service = module.get<RegistrationsService>(RegistrationsService);
  });

  describe('submit (BE010)', () => {
    const mockTeam = {
      id: 1,
      captainId: 10,
      categoryId: 5,
      status: TeamStatus.DRAFT,
      category: {
        id: 5,
        minPlayers: 3,
        maxPlayers: 5,
        tournament: {
          id: 100,
          status: TournamentStatus.REGISTRATION_OPEN,
        },
      },
      members: [{ id: 1, leftAt: null }, { id: 2, leftAt: null }, { id: 3, leftAt: null }],
      registration: null,
    };

    it('nộp hồ sơ đăng ký thành công khi đủ điều kiện', async () => {
      prisma.client.team.findUnique.mockResolvedValue(mockTeam);
      prisma.client.registration.upsert.mockResolvedValue({
        id: 1001,
        teamId: 1,
        status: RegistrationStatus.PENDING,
      });

      const result = await service.submit(1, 10, {
        application: { note: 'Đội sẵn sàng' },
      });

      expect(prisma.client.$queryRaw).toHaveBeenCalled();
      expect(prisma.client.registration.upsert).toHaveBeenCalled();
      expect(prisma.client.team.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: TeamStatus.PENDING },
      });
      expect(result.id).toBe(1001);
    });

    it('ném lỗi ForbiddenException nếu không phải Captain', async () => {
      prisma.client.team.findUnique.mockResolvedValue(mockTeam);

      await expect(service.submit(1, 999, {})).rejects.toThrow(ForbiddenException);
    });

    it('ném lỗi BadRequestException nếu giải đấu không mở đăng ký', async () => {
      const closedTeam = {
        ...mockTeam,
        category: {
          ...mockTeam.category,
          tournament: { id: 100, status: TournamentStatus.REGISTRATION_CLOSED },
        },
      };
      prisma.client.team.findUnique.mockResolvedValue(closedTeam);

      await expect(service.submit(1, 10, {})).rejects.toThrow(BadRequestException);
    });

    it('ném lỗi BadRequestException nếu số lượng thành viên vi phạm minPlayers', async () => {
      const smallTeam = {
        ...mockTeam,
        members: [{ id: 1, leftAt: null }], // chỉ có 1 member trong khi minPlayers là 3
      };
      prisma.client.team.findUnique.mockResolvedValue(smallTeam);

      await expect(service.submit(1, 10, {})).rejects.toThrow(BadRequestException);
    });

    it('ném lỗi ConflictException nếu đội đã có đơn PENDING', async () => {
      const pendingTeam = {
        ...mockTeam,
        status: TeamStatus.PENDING,
      };
      prisma.client.team.findUnique.mockResolvedValue(pendingTeam);

      await expect(service.submit(1, 10, {})).rejects.toThrow(ConflictException);
    });
  });

  describe('withdraw', () => {
    it('captain rút đơn đăng ký thành công khi đang PENDING', async () => {
      prisma.client.team.findUnique.mockResolvedValue({
        id: 1,
        captainId: 10,
        status: TeamStatus.PENDING,
        registration: { id: 1001, status: RegistrationStatus.PENDING },
      });
      prisma.client.registration.update.mockResolvedValue({
        id: 1001,
        status: RegistrationStatus.WITHDRAWN,
      });

      const result = await service.withdraw(1, 10);
      expect(prisma.client.registration.update).toHaveBeenCalledWith({
        where: { teamId: 1 },
        data: { status: RegistrationStatus.WITHDRAWN },
      });
      expect(prisma.client.team.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: TeamStatus.DRAFT },
      });
      expect(result.status).toBe(RegistrationStatus.WITHDRAWN);
    });
  });

  describe('approve (BE011)', () => {
    const mockRegistration = {
      id: 50,
      teamId: 1,
      status: RegistrationStatus.PENDING,
      team: {
        id: 1,
        categoryId: 5,
        category: {
          id: 5,
          maxTeams: 8,
          tournament: { id: 100, organizerId: 2 },
        },
      },
    };

    it('phê duyệt hồ sơ thành công khi quota còn chỗ', async () => {
      prisma.client.registration.findUnique.mockResolvedValue(mockRegistration);
      prisma.client.team.count.mockResolvedValue(7); // 7 đội đã duyệt, maxTeams là 8 -> còn chỗ!
      prisma.client.registration.update.mockResolvedValue({
        id: 50,
        status: RegistrationStatus.APPROVED,
      });

      const result = await service.approve(50, 2, Role.BTC, {
        reviewNote: 'Hồ sơ hợp lệ',
      });

      expect(prisma.client.$queryRaw).toHaveBeenCalled();
      expect(prisma.client.registration.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 50 },
          data: expect.objectContaining({
            status: RegistrationStatus.APPROVED,
            reviewedById: 2,
            reviewNote: 'Hồ sơ hợp lệ',
          }),
        }),
      );
      expect(prisma.client.team.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: TeamStatus.ACCEPTED },
      });
      expect(result.status).toBe(RegistrationStatus.APPROVED);
    });

    it('ném lỗi ConflictException khi số đội đã đạt maxTeams', async () => {
      prisma.client.registration.findUnique.mockResolvedValue(mockRegistration);
      prisma.client.team.count.mockResolvedValue(8); // Đã có 8 đội duyệt -> ĐẦY!

      await expect(
        service.approve(50, 2, Role.BTC, { reviewNote: 'Duyệt' }),
      ).rejects.toThrow(ConflictException);
    });

    it('ném lỗi ForbiddenException nếu BTC không sở hữu giải đấu', async () => {
      prisma.client.registration.findUnique.mockResolvedValue(mockRegistration);

      await expect(
        service.approve(50, 999, Role.BTC, {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('reject (BE011)', () => {
    it('từ chối hồ sơ thành công', async () => {
      const mockRegistration = {
        id: 50,
        teamId: 1,
        status: RegistrationStatus.PENDING,
        team: {
          id: 1,
          category: {
            tournament: { id: 100, organizerId: 2 },
          },
        },
      };

      prisma.client.registration.findUnique.mockResolvedValue(mockRegistration);
      prisma.client.registration.update.mockResolvedValue({
        id: 50,
        status: RegistrationStatus.REJECTED,
      });

      const result = await service.reject(50, 2, Role.BTC, {
        reviewNote: 'Thiếu thành viên dự bị',
      });

      expect(prisma.client.team.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: TeamStatus.REJECTED },
      });
      expect(result.status).toBe(RegistrationStatus.REJECTED);
    });
  });
});
