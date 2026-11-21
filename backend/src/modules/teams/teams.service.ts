import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
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
import { CreateTeamDto, TeamListQueryDto } from './dto/team.dto';

const teamDetails = {
  category: {
    select: {
      id: true,
      name: true,
      participationType: true,
      tournament: { select: { id: true, name: true, status: true } },
      game: { select: { id: true, name: true } },
    },
  },
  captain: { select: { id: true, name: true } },
  members: {
    where: { leftAt: null },
    orderBy: { joinedAt: 'asc' },
    select: {
      id: true,
      role: true,
      joinedAt: true,
      user: { select: { id: true, name: true } },
    },
  },
} as const;

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    categoryId: number,
    actor: { id: number; phone: string; role: Role; status: UserStatus },
    input: CreateTeamDto,
  ) {
    if (actor.role !== Role.PLAYER || actor.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(
        'Chỉ người chơi đang hoạt động mới có thể tạo đội.',
      );
    }
    if (!input.name.trim()) {
      throw new BadRequestException('Tên đội không được để trống.');
    }
    const memberPhones = input.memberPhones ?? [];
    if (new Set(memberPhones).size !== memberPhones.length) {
      throw new BadRequestException(
        'Danh sách thành viên không được trùng lặp.',
      );
    }
    const teammatePhones = memberPhones.filter(
      (phone) => phone !== actor.phone,
    );

    return this.prisma.client.$transaction(async (tx: any) => {
      // Serialize team creation for a category so its maxTeams limit cannot be raced.
      await tx.$queryRaw`SELECT "id" FROM "categories" WHERE "id" = ${categoryId} FOR UPDATE`;
      const category = await tx.category.findUnique({
        where: { id: categoryId },
        select: {
          id: true,
          participationType: true,
          minPlayers: true,
          maxPlayers: true,
          maxTeams: true,
          tournament: { select: { status: true } },
        },
      });
      if (!category) {
        throw new NotFoundException('Không tìm thấy hạng mục.');
      }
      if (category.tournament.status !== TournamentStatus.REGISTRATION_OPEN) {
        throw new ConflictException('Hạng mục hiện không mở tạo đội.');
      }

      const rosterSize = teammatePhones.length + 1;
      if (rosterSize < category.minPlayers) {
        throw new BadRequestException(
          'Roster chưa đạt số thành viên tối thiểu của hạng mục.',
        );
      }
      if (rosterSize > category.maxPlayers) {
        throw new BadRequestException(
          'Roster vượt quá số thành viên tối đa của hạng mục.',
        );
      }
      if (
        category.participationType === ParticipationType.SOLO &&
        rosterSize !== 1
      ) {
        throw new BadRequestException(
          'Đội SOLO phải có đúng một thành viên là captain.',
        );
      }

      const users = await tx.user.findMany({
        where: { phone: { in: teammatePhones } },
        select: { id: true, phone: true, status: true, role: true },
      });
      if (users.length !== teammatePhones.length) {
        throw new NotFoundException('Một hoặc nhiều người dùng không tồn tại.');
      }
      if (
        users.some(
          (user: any) =>
            user.status !== UserStatus.ACTIVE || user.role !== Role.PLAYER,
        )
      ) {
        throw new ConflictException(
          'Tất cả thành viên phải là người chơi đang hoạt động.',
        );
      }

      const rosterUserIds = [actor.id, ...users.map((user: any) => user.id)];
      const existingMemberships = await tx.teamMember.findMany({
        where: {
          userId: { in: rosterUserIds },
          leftAt: null,
          team: { categoryId: category.id, status: 'ACTIVE' },
        },
        select: { userId: true },
      });
      if (existingMemberships.length > 0) {
        throw new ConflictException(
          'Captain hoặc thành viên đã thuộc một đội khác trong hạng mục này.',
        );
      }

      if (category.maxTeams !== null) {
        const teamCount = await tx.team.count({
          where: { categoryId: category.id },
        });
        if (teamCount >= category.maxTeams) {
          throw new ConflictException('Hạng mục đã đạt giới hạn số đội.');
        }
      }

      const team = await tx.team.create({
        data: {
          categoryId: category.id,
          captainId: actor.id,
          name: input.name.trim(),
          members: {
            create: [
              { userId: actor.id, role: TeamMemberRole.CAPTAIN },
              ...users.map((user: any) => ({
                userId: user.id,
                role: TeamMemberRole.MEMBER,
              })),
            ],
          },
        },
        include: teamDetails,
      });
      return { ...team, rosterCount: rosterSize };
    });
  }

  async list(categoryId: number, query: TeamListQueryDto, actorId?: number) {
    const category = await this.getVisibleCategory(categoryId, actorId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = { categoryId: category.id, status: 'ACTIVE' as const };
    const [items, total] = await this.prisma.client.$transaction([
      this.prisma.client.team.findMany({
        where,
        orderBy: { id: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: teamDetails,
      }),
      this.prisma.client.team.count({ where }),
    ]);
    return {
      items: items.map((team: any) => ({
        ...team,
        rosterCount: team.members.length,
      })),
      total,
      page,
      limit,
    };
  }

  async getById(id: number, actorId?: number) {
    const team = await this.prisma.client.team.findUnique({
      where: { id },
      include: teamDetails,
    });
    if (!team) {
      throw new NotFoundException('Không tìm thấy đội.');
    }
    await this.getVisibleCategory(team.category.id, actorId);
    return { ...team, rosterCount: team.members.length };
  }

  private async getVisibleCategory(categoryId: number, actorId?: number) {
    const category = await this.prisma.client.category.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        tournament: { select: { status: true, organizerId: true } },
      },
    });
    if (!category) {
      throw new NotFoundException('Không tìm thấy hạng mục.');
    }
    if (
      category.tournament.status === TournamentStatus.DRAFT &&
      category.tournament.organizerId !== actorId
    ) {
      throw new NotFoundException('Không tìm thấy hạng mục.');
    }
    return category;
  }
}
