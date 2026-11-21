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
  TeamStatus,
  TournamentStatus,
  UserStatus,
} from '../../generated/prisma/enums';
import {
  AddTeamMemberDto,
  ChangeTeamCaptainDto,
  CreateTeamDto,
  TeamListQueryDto,
  UpdateTeamDto,
} from './dto/team.dto';

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
          team: {
            categoryId: category.id,
            status: {
              in: [TeamStatus.DRAFT, TeamStatus.PENDING, TeamStatus.ACCEPTED],
            },
          },
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
          where: {
            categoryId: category.id,
            status: {
              in: [TeamStatus.DRAFT, TeamStatus.PENDING, TeamStatus.ACCEPTED],
            },
          },
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
          status: TeamStatus.DRAFT,
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

  async update(
    teamId: number,
    actor: { id: number; role: Role; status: UserStatus },
    input: UpdateTeamDto,
  ) {
    if (actor.role !== Role.PLAYER || actor.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(
        'Chỉ người chơi đang hoạt động mới có thể sửa đội.',
      );
    }
    if (input.name !== undefined && !input.name.trim()) {
      throw new BadRequestException('Tên đội không được để trống.');
    }
    if (input.tag !== undefined && input.tag !== null && !input.tag.trim()) {
      throw new BadRequestException('Tag đội không được để trống.');
    }
    if (
      input.logoUrl !== undefined &&
      input.logoUrl !== null &&
      !input.logoUrl.trim()
    ) {
      throw new BadRequestException('Logo URL không được để trống.');
    }
    if (
      input.name === undefined &&
      input.tag === undefined &&
      input.logoUrl === undefined
    ) {
      throw new BadRequestException('Cần cung cấp thông tin đội cần cập nhật.');
    }

    return this.prisma.client.$transaction(async (tx: any) => {
      const existingTeam = await tx.team.findUnique({
        where: { id: teamId },
        select: { id: true, captainId: true, status: true },
      });
      if (!existingTeam) {
        throw new NotFoundException('Không tìm thấy đội.');
      }
      if (existingTeam.captainId !== actor.id) {
        throw new ForbiddenException('Chỉ captain mới có thể sửa đội.');
      }
      if (existingTeam.status !== TeamStatus.DRAFT) {
        throw new ConflictException(
          'Chỉ đội ở trạng thái DRAFT mới được chỉnh sửa.',
        );
      }

      const updatedTeam = await tx.team.update({
        where: { id: teamId },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.tag !== undefined
            ? { tag: input.tag === null ? null : input.tag.trim() }
            : {}),
          ...(input.logoUrl !== undefined
            ? { logoUrl: input.logoUrl === null ? null : input.logoUrl.trim() }
            : {}),
        },
        include: teamDetails,
      });
      return {
        ...updatedTeam,
        rosterCount: updatedTeam.members.length,
      };
    });
  }

  async addMember(
    teamId: number,
    actor: { id: number; role: Role; status: UserStatus },
    input: AddTeamMemberDto,
  ) {
    this.assertActivePlayer(actor, 'thêm thành viên');

    return this.prisma.client.$transaction(async (tx: any) => {
      const team = await this.getDraftTeamForCaptain(tx, teamId, actor.id);
      if (team.category.participationType === ParticipationType.SOLO) {
        throw new BadRequestException(
          'Không thể thêm thành viên vào đội SOLO.',
        );
      }

      const user = await tx.user.findUnique({
        where: { phone: input.phone },
        select: { id: true, status: true, role: true },
      });
      if (!user) {
        throw new NotFoundException('Không tìm thấy người dùng.');
      }
      if (user.status !== UserStatus.ACTIVE || user.role !== Role.PLAYER) {
        throw new ConflictException(
          'Thành viên phải là người chơi đang hoạt động.',
        );
      }

      const existingMembership = await tx.teamMember.findFirst({
        where: {
          userId: user.id,
          leftAt: null,
          team: {
            categoryId: team.categoryId,
            status: {
              in: [TeamStatus.DRAFT, TeamStatus.PENDING, TeamStatus.ACCEPTED],
            },
          },
        },
        select: { id: true },
      });
      if (existingMembership) {
        throw new ConflictException(
          'Người chơi đã thuộc một đội trong hạng mục này.',
        );
      }

      const rosterCount = await tx.teamMember.count({
        where: { teamId, leftAt: null },
      });
      if (rosterCount >= team.category.maxPlayers) {
        throw new BadRequestException(
          'Roster đã đạt số thành viên tối đa của hạng mục.',
        );
      }

      const previousMembership = await tx.teamMember.findFirst({
        where: { teamId, userId: user.id },
        select: { id: true },
      });
      if (previousMembership) {
        await tx.teamMember.update({
          where: { id: previousMembership.id },
          data: {
            leftAt: null,
            joinedAt: new Date(),
            role: TeamMemberRole.MEMBER,
          },
        });
      } else {
        await tx.teamMember.create({
          data: {
            teamId,
            userId: user.id,
            role: TeamMemberRole.MEMBER,
          },
        });
      }

      return this.getTeamDetails(tx, teamId);
    });
  }

  async removeMember(
    teamId: number,
    actor: { id: number; role: Role; status: UserStatus },
    phone: string,
  ) {
    this.assertActivePlayer(actor, 'xóa thành viên');
    if (!/^[0-9]{10}$/.test(phone)) {
      throw new BadRequestException('Số điện thoại phải gồm đúng 10 chữ số.');
    }

    return this.prisma.client.$transaction(async (tx: any) => {
      const team = await this.getDraftTeamForCaptain(tx, teamId, actor.id);
      if (team.category.participationType === ParticipationType.SOLO) {
        throw new BadRequestException('Không thể xóa thành viên của đội SOLO.');
      }

      const user = await tx.user.findUnique({
        where: { phone },
        select: { id: true },
      });
      if (!user) {
        throw new NotFoundException('Không tìm thấy người dùng.');
      }
      if (user.id === team.captainId) {
        throw new ConflictException(
          'Không thể xóa captain khỏi roster; hãy đổi captain trước.',
        );
      }

      const membership = await tx.teamMember.findFirst({
        where: { teamId, userId: user.id, leftAt: null },
        select: { id: true },
      });
      if (!membership) {
        throw new NotFoundException('Người dùng không thuộc roster của đội.');
      }

      const rosterCount = await tx.teamMember.count({
        where: { teamId, leftAt: null },
      });
      if (rosterCount - 1 < team.category.minPlayers) {
        throw new BadRequestException(
          'Không thể xóa vì roster sẽ thấp hơn số thành viên tối thiểu của hạng mục.',
        );
      }

      const removed = await tx.teamMember.updateMany({
        where: { id: membership.id, leftAt: null },
        data: { leftAt: new Date() },
      });
      if (removed.count !== 1) {
        throw new ConflictException('Roster đã thay đổi; hãy thử lại.');
      }

      return this.getTeamDetails(tx, teamId);
    });
  }

  async changeCaptain(
    teamId: number,
    actor: { id: number; role: Role; status: UserStatus },
    input: ChangeTeamCaptainDto,
  ) {
    this.assertActivePlayer(actor, 'đổi captain');

    return this.prisma.client.$transaction(async (tx: any) => {
      const team = await this.getDraftTeamForCaptain(tx, teamId, actor.id);
      const user = await tx.user.findUnique({
        where: { phone: input.phone },
        select: { id: true, status: true, role: true },
      });
      if (!user) {
        throw new NotFoundException('Không tìm thấy người dùng.');
      }
      if (user.status !== UserStatus.ACTIVE || user.role !== Role.PLAYER) {
        throw new ConflictException(
          'Captain mới phải là người chơi đang hoạt động.',
        );
      }
      if (user.id === team.captainId) {
        return this.getTeamDetails(tx, teamId);
      }
      if (team.category.participationType === ParticipationType.SOLO) {
        throw new BadRequestException(
          'Đội SOLO chỉ có captain hiện tại trong roster.',
        );
      }

      const newCaptainMembership = await tx.teamMember.findFirst({
        where: { teamId, userId: user.id, leftAt: null },
        select: { id: true },
      });
      if (!newCaptainMembership) {
        throw new BadRequestException('Captain mới phải thuộc roster của đội.');
      }

      const otherMembership = await tx.teamMember.findFirst({
        where: {
          userId: user.id,
          teamId: { not: teamId },
          leftAt: null,
          team: {
            categoryId: team.categoryId,
            status: {
              in: [TeamStatus.DRAFT, TeamStatus.PENDING, TeamStatus.ACCEPTED],
            },
          },
        },
        select: { id: true },
      });
      if (otherMembership) {
        throw new ConflictException(
          'Captain mới đã thuộc một đội khác trong hạng mục này.',
        );
      }

      const oldCaptainMembership = await tx.teamMember.findFirst({
        where: {
          teamId,
          userId: team.captainId,
          leftAt: null,
          role: TeamMemberRole.CAPTAIN,
        },
        select: { id: true },
      });
      if (!oldCaptainMembership) {
        throw new ConflictException('Roster hiện tại không có captain hợp lệ.');
      }

      await tx.teamMember.update({
        where: { id: oldCaptainMembership.id },
        data: { role: TeamMemberRole.MEMBER },
      });
      await tx.teamMember.update({
        where: { id: newCaptainMembership.id },
        data: { role: TeamMemberRole.CAPTAIN },
      });
      await tx.team.update({
        where: { id: teamId },
        data: { captainId: user.id },
      });

      return this.getTeamDetails(tx, teamId);
    });
  }

  async list(categoryId: number, query: TeamListQueryDto, actorId?: number) {
    const category = await this.getVisibleCategory(categoryId, actorId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = {
      categoryId: category.id,
      OR: [
        { status: TeamStatus.ACCEPTED },
        ...(actorId ? [{ captainId: actorId }] : []),
      ],
    };
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
    if (team.status !== TeamStatus.ACCEPTED && team.captainId !== actorId) {
      throw new NotFoundException('Không tìm thấy đội.');
    }
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

  private assertActivePlayer(
    actor: { role: Role; status: UserStatus },
    action: string,
  ) {
    if (actor.role !== Role.PLAYER || actor.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(
        `Chỉ người chơi đang hoạt động mới có thể ${action}.`,
      );
    }
  }

  private async getDraftTeamForCaptain(
    tx: any,
    teamId: number,
    actorId: number,
  ) {
    const team = await tx.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        categoryId: true,
        captainId: true,
        status: true,
        category: {
          select: {
            id: true,
            participationType: true,
            minPlayers: true,
            maxPlayers: true,
          },
        },
      },
    });
    if (!team) {
      throw new NotFoundException('Không tìm thấy đội.');
    }
    if (team.captainId !== actorId) {
      throw new ForbiddenException('Chỉ captain mới có thể quản lý roster.');
    }
    if (team.status !== TeamStatus.DRAFT) {
      throw new ConflictException(
        'Chỉ đội ở trạng thái DRAFT mới được chỉnh sửa roster.',
      );
    }

    await tx.$queryRaw`SELECT "id" FROM "categories" WHERE "id" = ${team.categoryId} FOR UPDATE`;

    const captains = await tx.teamMember.findMany({
      where: { teamId, leftAt: null, role: TeamMemberRole.CAPTAIN },
      select: { userId: true },
    });
    if (captains.length !== 1 || captains[0].userId !== team.captainId) {
      throw new ConflictException(
        'Đội phải có đúng một captain hợp lệ trong roster.',
      );
    }

    return team;
  }

  private async getTeamDetails(tx: any, teamId: number) {
    const team = await tx.team.findUnique({
      where: { id: teamId },
      include: teamDetails,
    });
    return { ...team, rosterCount: team.members.length };
  }
}
