import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '../../format-response/errors/error';
import {
  RegistrationStatus,
  Role,
  TeamStatus,
  TournamentStatus,
} from '../../generated/prisma/enums';
import { TournamentsService } from '../tournaments/tournaments.service';
import {
  RegistrationListQueryDto,
  ReviewRegistrationDto,
  SubmitRegistrationDto,
} from './dto/registration.dto';

@Injectable()
export class RegistrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tournaments: TournamentsService,
  ) {}

  // ==================== BE010: CAPTAIN NỘP ĐĂNG KÝ ====================

  async submit(teamId: number, actorId: number, dto: SubmitRegistrationDto) {
    return this.prisma.client.$transaction(async (tx: any) => {
      const team = await tx.team.findUnique({
        where: { id: teamId },
        include: {
          category: {
            include: { tournament: true },
          },
          members: { where: { leftAt: null } },
          registration: true,
        },
      });

      if (!team) {
        throw new NotFoundException('Không tìm thấy đội thi đấu.');
      }

      if (team.captainId !== actorId) {
        throw new ForbiddenException(
          'Chỉ đội trưởng mới có quyền nộp đơn đăng ký tham gia giải đấu.',
        );
      }

      if (team.status === TeamStatus.DISBANDED) {
        throw new BadRequestException('Đội đã giải tán, không thể đăng ký thi đấu.');
      }

      if (
        team.status === TeamStatus.PENDING ||
        team.registration?.status === RegistrationStatus.PENDING
      ) {
        throw new ConflictException(
          'Đội đã có đơn đăng ký đang chờ Ban tổ chức xét duyệt.',
        );
      }

      if (
        team.status === TeamStatus.ACCEPTED ||
        team.registration?.status === RegistrationStatus.APPROVED
      ) {
        throw new ConflictException(
          'Đội đã được Ban tổ chức phê duyệt tham gia giải đấu.',
        );
      }

      const tournament = team.category.tournament;
      if (tournament.status !== TournamentStatus.REGISTRATION_OPEN) {
        throw new BadRequestException(
          'Giải đấu hiện không mở đăng ký tham gia.',
        );
      }

      const activeMembersCount = team.members.length;
      if (
        activeMembersCount < team.category.minPlayers ||
        activeMembersCount > team.category.maxPlayers
      ) {
        throw new BadRequestException(
          `Số lượng thành viên trong đội (${activeMembersCount}) không đáp ứng quy định của hạng mục (tối thiểu ${team.category.minPlayers}, tối đa ${team.category.maxPlayers} người).`,
        );
      }

      // Khóa dòng Category để serialize kiểm tra quota và đồng bộ luồng đăng ký
      await tx.$queryRaw`SELECT "id" FROM "categories" WHERE "id" = ${team.categoryId} FOR UPDATE`;

      const registration = await tx.registration.upsert({
        where: { teamId },
        create: {
          teamId,
          submittedById: actorId,
          status: RegistrationStatus.PENDING,
          application: dto.application ?? null,
          submittedAt: new Date(),
        },
        update: {
          submittedById: actorId,
          status: RegistrationStatus.PENDING,
          application: dto.application ?? null,
          submittedAt: new Date(),
          reviewedById: null,
          reviewedAt: null,
          reviewNote: null,
          rosterLockedAt: null,
        },
      });

      await tx.team.update({
        where: { id: teamId },
        data: { status: TeamStatus.PENDING },
      });

      await this.recordAudit(
        tx,
        actorId,
        'REGISTRATION_SUBMITTED',
        registration.id,
      );

      return registration;
    });
  }

  // ==================== CAPTAIN HỦY ĐĂNG KÝ KHI CHỜ DUYỆT ====================

  async withdraw(teamId: number, actorId: number) {
    return this.prisma.client.$transaction(async (tx: any) => {
      const team = await tx.team.findUnique({
        where: { id: teamId },
        include: { registration: true },
      });

      if (!team) {
        throw new NotFoundException('Không tìm thấy đội thi đấu.');
      }

      if (team.captainId !== actorId) {
        throw new ForbiddenException(
          'Chỉ đội trưởng mới có quyền rút đơn đăng ký.',
        );
      }

      if (
        team.status !== TeamStatus.PENDING ||
        !team.registration ||
        team.registration.status !== RegistrationStatus.PENDING
      ) {
        throw new BadRequestException(
          'Chỉ có thể rút đơn đăng ký khi hồ sơ đang ở trạng thái chờ xét duyệt (PENDING).',
        );
      }

      const registration = await tx.registration.update({
        where: { teamId },
        data: {
          status: RegistrationStatus.WITHDRAWN,
        },
      });

      await tx.team.update({
        where: { id: teamId },
        data: { status: TeamStatus.DRAFT },
      });

      await this.recordAudit(
        tx,
        actorId,
        'REGISTRATION_WITHDRAWN',
        registration.id,
      );

      return registration;
    });
  }

  // ==================== BE011: BTC XEM DANH SÁCH & CHI TIẾT ====================

  async list(
    tournamentId: number,
    query: RegistrationListQueryDto,
    actorId: number,
    actorRole: Role,
  ) {
    if (actorRole !== Role.ADMIN) {
      await this.tournaments.getOwnedTournament(tournamentId, actorId);
    } else {
      const tour = await this.prisma.client.tournament.findUnique({
        where: { id: tournamentId },
      });
      if (!tour) throw new NotFoundException('Không tìm thấy giải đấu.');
    }

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);

    const where: any = {
      team: {
        category: { tournamentId },
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' } },
                { tag: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await this.prisma.client.$transaction([
      this.prisma.client.registration.findMany({
        where,
        orderBy: { submittedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          team: {
            select: {
              id: true,
              name: true,
              tag: true,
              logoUrl: true,
              status: true,
              categoryId: true,
              captain: { select: { id: true, name: true, phone: true } },
              _count: {
                select: {
                  members: { where: { leftAt: null } },
                },
              },
            },
          },
          submittedBy: { select: { id: true, name: true } },
          reviewedBy: { select: { id: true, name: true } },
        },
      }),
      this.prisma.client.registration.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getById(id: number, actorId: number, actorRole: Role) {
    const registration = await this.prisma.client.registration.findUnique({
      where: { id },
      include: {
        team: {
          include: {
            category: {
              include: {
                tournament: {
                  select: { id: true, name: true, organizerId: true, status: true },
                },
                game: { select: { id: true, name: true } },
              },
            },
            captain: { select: { id: true, name: true, phone: true, email: true } },
            members: {
              where: { leftAt: null },
              include: {
                user: { select: { id: true, name: true } },
              },
              orderBy: { joinedAt: 'asc' },
            },
          },
        },
        submittedBy: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
    });

    if (!registration) {
      throw new NotFoundException('Không tìm thấy hồ sơ đăng ký.');
    }

    const isBtcOwner =
      registration.team.category.tournament.organizerId === actorId;
    const isCaptain = registration.team.captainId === actorId;
    const isAdmin = actorRole === Role.ADMIN;

    if (!isBtcOwner && !isCaptain && !isAdmin) {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập hồ sơ đăng ký này.',
      );
    }

    return registration;
  }

  // ==================== BE011: BTC DUYỆT (APPROVE) VỚI QUOTA LOCKING ====================

  async approve(
    id: number,
    actorId: number,
    actorRole: Role,
    dto: ReviewRegistrationDto,
  ) {
    return this.prisma.client.$transaction(async (tx: any) => {
      const registration = await tx.registration.findUnique({
        where: { id },
        include: {
          team: {
            include: {
              category: {
                include: { tournament: true },
              },
              members: { where: { leftAt: null } },
            },
          },
        },
      });

      if (!registration) {
        throw new NotFoundException('Không tìm thấy hồ sơ đăng ký.');
      }

      if (
        actorRole !== Role.ADMIN &&
        registration.team.category.tournament.organizerId !== actorId
      ) {
        throw new ForbiddenException(
          'Bạn không có quyền phê duyệt hồ sơ của giải đấu này.',
        );
      }

      if (registration.status !== RegistrationStatus.PENDING) {
        throw new BadRequestException(
          'Chỉ có thể phê duyệt hồ sơ đang ở trạng thái chờ xét duyệt (PENDING).',
        );
      }

      const category = registration.team.category;

      // Khóa dòng Category bằng SELECT FOR UPDATE để ngăn ngừa race condition vượt quota
      await tx.$queryRaw`SELECT "id" FROM "categories" WHERE "id" = ${category.id} FOR UPDATE`;

      const acceptedTeamsCount = await tx.team.count({
        where: {
          categoryId: category.id,
          status: TeamStatus.ACCEPTED,
        },
      });

      if (acceptedTeamsCount >= category.maxTeams) {
        throw new ConflictException(
          `Hạng mục đã đạt giới hạn tối đa số đội tham gia (${category.maxTeams} đội). Không thể phê duyệt thêm.`,
        );
      }

      const updated = await tx.registration.update({
        where: { id },
        data: {
          status: RegistrationStatus.APPROVED,
          reviewedById: actorId,
          reviewedAt: new Date(),
          rosterLockedAt: new Date(),
          reviewNote: dto.reviewNote ?? null,
        },
      });

      await tx.team.update({
        where: { id: registration.teamId },
        data: { status: TeamStatus.ACCEPTED },
      });

      await this.recordAudit(tx, actorId, 'REGISTRATION_APPROVED', id);

      return updated;
    });
  }

  // ==================== BE011: BTC TỪ CHỐI (REJECT) ====================

  async reject(
    id: number,
    actorId: number,
    actorRole: Role,
    dto: ReviewRegistrationDto,
  ) {
    return this.prisma.client.$transaction(async (tx: any) => {
      const registration = await tx.registration.findUnique({
        where: { id },
        include: {
          team: {
            include: {
              category: {
                include: { tournament: true },
              },
            },
          },
        },
      });

      if (!registration) {
        throw new NotFoundException('Không tìm thấy hồ sơ đăng ký.');
      }

      if (
        actorRole !== Role.ADMIN &&
        registration.team.category.tournament.organizerId !== actorId
      ) {
        throw new ForbiddenException(
          'Bạn không có quyền từ chối hồ sơ của giải đấu này.',
        );
      }

      if (registration.status !== RegistrationStatus.PENDING) {
        throw new BadRequestException(
          'Chỉ có thể từ chối hồ sơ đang ở trạng thái chờ xét duyệt (PENDING).',
        );
      }

      const updated = await tx.registration.update({
        where: { id },
        data: {
          status: RegistrationStatus.REJECTED,
          reviewedById: actorId,
          reviewedAt: new Date(),
          reviewNote: dto.reviewNote ?? 'Hồ sơ không đáp ứng tiêu chuẩn của giải đấu.',
        },
      });

      await tx.team.update({
        where: { id: registration.teamId },
        data: { status: TeamStatus.REJECTED },
      });

      await this.recordAudit(tx, actorId, 'REGISTRATION_REJECTED', id);

      return updated;
    });
  }

  private async recordAudit(
    tx: any,
    actorId: number,
    action: string,
    entityId: number,
  ) {
    await tx.auditLog.create({
      data: {
        actorId,
        action,
        entityType: 'Registration',
        entityId: String(entityId),
      },
    });
  }
}
