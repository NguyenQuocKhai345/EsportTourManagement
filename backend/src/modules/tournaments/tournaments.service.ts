import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '../../format-response/errors/error';
import { TournamentStatus } from '../../generated/prisma/enums';
import {
  CreateTournamentDto,
  TournamentListQueryDto,
  UpdateTournamentDto,
} from './dto/tournament.dto';

@Injectable()
export class TournamentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(actorId: number, input: CreateTournamentDto) {
    this.validateDates(input.startsAt, input.endsAt);
    const created = await this.prisma.client.tournament.create({
      data: {
        organizerId: actorId,
        name: input.name,
        description: input.description,
        status: input.status ?? TournamentStatus.DRAFT,
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
      },
    });
    await this.recordAudit(actorId, 'TOURNAMENT_CREATED', created.id, {
      name: created.name,
    });
    return created;
  }

  async list(query: TournamentListQueryDto, actorId?: number) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const where: any = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' } }
        : {}),
      ...(actorId
        ? {
            OR: [
              { status: { not: TournamentStatus.DRAFT } },
              { organizerId: actorId },
            ],
          }
        : { status: { not: TournamentStatus.DRAFT } }),
    };
    const [items, total] = await this.prisma.client.$transaction([
      this.prisma.client.tournament.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.client.tournament.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async getById(id: number, actorId?: number) {
    const tournament = await this.prisma.client.tournament.findUnique({
      where: { id },
      include: {
        categories: {
          include: { eligibilityRules: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    });
    if (
      !tournament ||
      (tournament.status === TournamentStatus.DRAFT &&
        tournament.organizerId !== actorId)
    ) {
      throw new NotFoundException('Không tìm thấy giải đấu.');
    }
    return tournament;
  }

  async update(id: number, actorId: number, input: UpdateTournamentDto) {
    const tournament = await this.getOwnedTournament(id, actorId);
    if (
      tournament.status === TournamentStatus.COMPLETED ||
      tournament.status === TournamentStatus.CANCELLED
    ) {
      if (input.status && input.status !== tournament.status) {
        throw new ConflictException(
          'Không thể thay đổi trạng thái giải đã kết thúc hoặc bị hủy.',
        );
      }
    }
    const startsAt =
      input.startsAt === undefined
        ? tournament.startsAt
        : input.startsAt
        ? new Date(input.startsAt)
        : null;
    const endsAt =
      input.endsAt === undefined
        ? tournament.endsAt
        : input.endsAt
        ? new Date(input.endsAt)
        : null;
    this.validateDates(startsAt, endsAt);
    const updated = await this.prisma.client.tournament.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.startsAt !== undefined ? { startsAt } : {}),
        ...(input.endsAt !== undefined ? { endsAt } : {}),
      },
    });
    await this.recordAudit(actorId, 'TOURNAMENT_UPDATED', id, input);
    return updated;
  }

  async remove(id: number, actorId: number) {
    const tournament = await this.getOwnedTournament(id, actorId);
    try {
      await this.prisma.client.$transaction(async (tx: any) => {
        const categoryIds = await this.assertTournamentDeleteAllowed(
          tx,
          tournament.id,
        );
        await this.assertNoCategoryDependencies(tx, categoryIds);
        if (categoryIds.length) {
          await tx.stage.deleteMany({
            where: { categoryId: { in: categoryIds } },
          });
        }
        await tx.ruleDocument.deleteMany({
          where: {
            OR: [
              { tournamentId: id },
              ...(categoryIds.length
                ? [{ categoryId: { in: categoryIds } }]
                : []),
            ],
          },
        });
        await tx.category.deleteMany({ where: { tournamentId: id } });
        await tx.tournament.delete({ where: { id } });
        await tx.auditLog.create({
          data: {
            actorId,
            action: 'TOURNAMENT_DELETED',
            entityType: 'Tournament',
            entityId: String(id),
          },
        });
      });
    } catch (error: any) {
      if (error?.code === 'P2003') {
        throw new ConflictException(
          'Không thể xóa giải đấu đang có dữ liệu phụ thuộc.',
        );
      }
      throw error;
    }
    return { id };
  }

  async getOwnedTournament(
    id: number,
    actorId: number,
    tx: any = this.prisma.client,
  ) {
    const tournament = await tx.tournament.findUnique({ where: { id } });
    if (!tournament) throw new NotFoundException('Không tìm thấy giải đấu.');
    if (tournament.organizerId !== actorId)
      throw new ForbiddenException('Bạn không quản lý giải đấu này.');
    return tournament;
  }

  async assertTournamentDeleteAllowed(tx: any, tournamentId: number) {
    const tournament = await tx.tournament.findUnique({
      where: { id: tournamentId },
      select: { id: true, status: true },
    });
    if (!tournament) throw new NotFoundException('Không tìm thấy giải đấu.');
    if (
      tournament.status !== TournamentStatus.DRAFT &&
      tournament.status !== TournamentStatus.REGISTRATION_OPEN
    ) {
      throw new ConflictException(
        'Chỉ có thể xóa giải ở trạng thái DRAFT hoặc REGISTRATION_OPEN.',
      );
    }
    const categoryIds = (
      await tx.category.findMany({
        where: { tournamentId },
        select: { id: true },
      })
    ).map((c: any) => c.id);
    // Categories, eligibility rules, rule documents and stages are tournament-owned setup data.
    // Player-created teams/registrations are checked separately before deletion.
    return categoryIds;
  }

  async assertNoCategoryDependencies(tx: any, categoryIds: number[]) {
    if (!categoryIds.length) return;
    const categoryFilter = { categoryId: { in: categoryIds } };
    const matchFilter = { stage: categoryFilter };
    const [teams, registrations, resultSubmissions, disputes] =
      await Promise.all([
        tx.team.count({ where: { categoryId: { in: categoryIds } } }),
        tx.registration.count({
          where: { team: { categoryId: { in: categoryIds } } },
        }),
        tx.matchResultSubmission.count({ where: { match: matchFilter } }),
        tx.dispute.count({ where: { match: matchFilter } }),
      ]);
    if (teams || registrations || resultSubmissions || disputes) {
      throw new ConflictException(
        'Không thể xóa vì người chơi đã tạo đội, đăng ký hoặc có dữ liệu trận đấu.',
      );
    }
  }

  async recordAudit(
    actorId: number,
    action: string,
    entityId: number,
    changes?: unknown,
  ) {
    await this.prisma.client.auditLog.create({
      data: {
        actorId,
        action,
        entityType: action.startsWith('CATEGORY') ? 'Category' : 'Tournament',
        entityId: String(entityId),
        ...(changes ? { changes: changes as any } : {}),
      },
    });
  }

  private validateDates(
    start: Date | string | null | undefined,
    end: Date | string | null | undefined,
  ) {
    if (start && end && new Date(start).getTime() >= new Date(end).getTime()) {
      throw new BadRequestException(
        'Thời gian bắt đầu phải trước thời gian kết thúc.',
      );
    }
  }
}
