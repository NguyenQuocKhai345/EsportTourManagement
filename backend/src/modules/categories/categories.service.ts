import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '../../format-response/errors/error';
import {
  ParticipationType,
  TournamentStatus,
} from '../../generated/prisma/enums';
import { TournamentsService } from '../tournaments/tournaments.service';
import {
  CategoryListQueryDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tournaments: TournamentsService,
  ) {}

  async list(
    tournamentId: number,
    query: CategoryListQueryDto,
    actorId?: number,
  ) {
    await this.tournaments.getById(tournamentId, actorId);
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const where = {
      tournamentId,
      ...(query.gameId ? { gameId: query.gameId } : {}),
      ...(query.participationType
        ? { participationType: query.participationType }
        : {}),
    };
    const [items, total] = await this.prisma.client.$transaction([
      this.prisma.client.category.findMany({
        where,
        orderBy: { id: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.client.category.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async get(tournamentId: number, categoryId: number, actorId?: number) {
    await this.tournaments.getById(tournamentId, actorId);
    const category = await this.prisma.client.category.findFirst({
      where: { id: categoryId, tournamentId },
      include: {
        eligibilityRules: { orderBy: { sortOrder: 'asc' } },
        game: true,
      },
    });
    if (!category)
      throw new NotFoundException(
        'Không tìm thấy hạng mục trong giải đấu này.',
      );
    return category;
  }

  async create(
    tournamentId: number,
    actorId: number,
    input: CreateCategoryDto,
  ) {
    await this.assertWritableTournament(tournamentId, actorId);
    this.validateSize(
      input.participationType,
      input.minTeamSize,
      input.maxTeamSize,
    );
    await this.assertGameExists(input.gameId);
    try {
      const created = await this.prisma.client.$transaction(async (tx: any) => {
        const category = await tx.category.create({
          data: this.categoryData(tournamentId, input),
        });
        if (input.eligibilityRules)
          await this.replaceEligibilityRules(
            tx,
            category.id,
            input.eligibilityRules,
          );
        return tx.category.findUnique({
          where: { id: category.id },
          include: { eligibilityRules: { orderBy: { sortOrder: 'asc' } } },
        });
      });
      await this.tournaments.recordAudit(
        actorId,
        'CATEGORY_CREATED',
        created.id,
        { tournamentId },
      );
      return created;
    } catch (error: any) {
      this.handlePrismaError(error);
    }
  }

  async update(
    tournamentId: number,
    categoryId: number,
    actorId: number,
    input: UpdateCategoryDto,
  ) {
    await this.assertWritableTournament(tournamentId, actorId);
    const existing = await this.getCategoryForWrite(tournamentId, categoryId);
    const participationType =
      input.participationType ?? existing.participationType;
    const minTeamSize = input.minTeamSize ?? existing.minPlayers;
    const maxTeamSize = input.maxTeamSize ?? existing.maxPlayers;
    this.validateSize(participationType, minTeamSize, maxTeamSize);
    if (input.gameId !== undefined) await this.assertGameExists(input.gameId);

    const affectsRegistration =
      input.gameId !== undefined ||
      input.participationType !== undefined ||
      input.minTeamSize !== undefined ||
      input.maxTeamSize !== undefined ||
      input.maxTeams !== undefined;
    if (affectsRegistration)
      await this.assertNoRegistrationDependencies(categoryId);

    try {
      const updated = await this.prisma.client.$transaction(async (tx: any) => {
        await tx.category.update({
          where: { id: categoryId },
          data: {
            ...(input.gameId !== undefined ? { gameId: input.gameId } : {}),
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.description !== undefined
              ? { description: input.description }
              : {}),
            ...(input.participationType !== undefined
              ? { participationType: input.participationType }
              : {}),
            ...(input.minTeamSize !== undefined
              ? { minPlayers: input.minTeamSize }
              : {}),
            ...(input.maxTeamSize !== undefined
              ? { maxPlayers: input.maxTeamSize }
              : {}),
            ...(input.maxTeams !== undefined
              ? { maxTeams: input.maxTeams }
              : {}),
          },
        });
        if (input.eligibilityRules !== undefined) {
          await this.replaceEligibilityRules(
            tx,
            categoryId,
            input.eligibilityRules,
          );
        }
        return tx.category.findUnique({
          where: { id: categoryId },
          include: { eligibilityRules: { orderBy: { sortOrder: 'asc' } } },
        });
      });
      await this.tournaments.recordAudit(
        actorId,
        'CATEGORY_UPDATED',
        categoryId,
        input,
      );
      return updated;
    } catch (error: any) {
      this.handlePrismaError(error);
    }
  }

  async remove(tournamentId: number, categoryId: number, actorId: number) {
    await this.tournaments.getOwnedTournament(tournamentId, actorId);
    await this.getCategoryForWrite(tournamentId, categoryId);
    try {
      await this.prisma.client.$transaction(async (tx: any) => {
        const tournament = await tx.tournament.findUnique({
          where: { id: tournamentId },
          select: { status: true },
        });
        if (!tournament) {
          throw new NotFoundException('Không tìm thấy giải đấu.');
        }
        if (
          tournament.status !== TournamentStatus.DRAFT &&
          tournament.status !== TournamentStatus.REGISTRATION_OPEN
        ) {
          throw new ConflictException(
            'Chỉ có thể xóa hạng mục khi giải ở trạng thái DRAFT hoặc REGISTRATION_OPEN.',
          );
        }
        await this.tournaments.assertNoCategoryDependencies(tx, [categoryId]);
        await tx.stage.deleteMany({ where: { categoryId } });
        await tx.ruleDocument.deleteMany({ where: { categoryId } });
        await tx.categoryEligibilityRule.deleteMany({ where: { categoryId } });
        await tx.category.delete({ where: { id: categoryId } });
        await tx.auditLog.create({
          data: {
            actorId,
            action: 'CATEGORY_DELETED',
            entityType: 'Category',
            entityId: String(categoryId),
          },
        });
      });
    } catch (error: any) {
      if (error?.code === 'P2003') {
        throw new ConflictException(
          'Không thể xóa hạng mục đang có dữ liệu phụ thuộc.',
        );
      }
      throw error;
    }
    return { id: categoryId };
  }

  private categoryData(tournamentId: number, input: CreateCategoryDto) {
    return {
      tournamentId,
      gameId: input.gameId,
      name: input.name,
      description: input.description,
      participationType: input.participationType,
      minPlayers: input.minTeamSize,
      maxPlayers: input.maxTeamSize,
      maxTeams: input.maxTeams,
    };
  }

  private async replaceEligibilityRules(
    tx: any,
    categoryId: number,
    rules: string[],
  ) {
    await tx.categoryEligibilityRule.deleteMany({ where: { categoryId } });
    if (rules.length) {
      await tx.categoryEligibilityRule.createMany({
        data: rules.map((description, sortOrder) => ({
          categoryId,
          name: description.slice(0, 150) || `Điều kiện ${sortOrder + 1}`,
          description,
          sortOrder,
        })),
      });
    }
  }

  private validateSize(type: ParticipationType, min: number, max: number) {
    if (type === ParticipationType.SOLO && (min !== 1 || max !== 1)) {
      throw new BadRequestException(
        'Hạng mục SOLO phải có minTeamSize và maxTeamSize bằng 1.',
      );
    }
    if (type === ParticipationType.TEAM && min > max) {
      throw new BadRequestException(
        'minTeamSize không được lớn hơn maxTeamSize.',
      );
    }
  }

  private async assertWritableTournament(
    tournamentId: number,
    actorId: number,
  ) {
    const tournament = await this.tournaments.getOwnedTournament(
      tournamentId,
      actorId,
    );
    if (
      [TournamentStatus.COMPLETED, TournamentStatus.CANCELLED].includes(
        tournament.status,
      )
    ) {
      throw new ConflictException(
        'Không thể thay đổi hạng mục của giải đã kết thúc hoặc bị hủy.',
      );
    }
  }

  private async getCategoryForWrite(tournamentId: number, categoryId: number) {
    const category = await this.prisma.client.category.findFirst({
      where: { id: categoryId, tournamentId },
    });
    if (!category)
      throw new NotFoundException(
        'Không tìm thấy hạng mục trong giải đấu này.',
      );
    return category;
  }

  private async assertGameExists(gameId: number) {
    const game = await this.prisma.client.game.findUnique({
      where: { id: gameId },
      select: { id: true },
    });
    if (!game) throw new NotFoundException('Không tìm thấy trò chơi.');
  }

  private async assertNoRegistrationDependencies(categoryId: number) {
    const teams = await this.prisma.client.team.count({
      where: { categoryId },
    });
    // Registration rows are attached to teams; block configuration edits once the category has teams.
    if (teams)
      throw new ConflictException(
        'Không thể đổi cấu hình đăng ký sau khi hạng mục đã có đội.',
      );
    // TODO: Add a direct registration check if registrations are later detached from teams.
  }

  private handlePrismaError(error: any): never {
    if (error?.code === 'P2002')
      throw new ConflictException('Tên hạng mục đã tồn tại trong giải đấu.');
    if (error?.code === 'P2003' || error?.code === 'P2025')
      throw new NotFoundException('Giải đấu hoặc trò chơi không tồn tại.');
    throw error;
  }
}
