import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BadRequestException,
  NotFoundException,
} from '../../format-response/errors/error';
import { Role, TournamentStatus } from '../../generated/prisma/enums';
import { TournamentsService } from '../tournaments/tournaments.service';
import {
  CreateRuleDocumentDto,
  RuleDocumentListQueryDto,
  UpdateRuleDocumentDto,
} from './dto/rule-document.dto';

@Injectable()
export class RulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tournaments: TournamentsService,
  ) {}

  async create(
    tournamentId: number,
    actorId: number,
    actorRole: Role,
    dto: CreateRuleDocumentDto,
  ) {
    if (actorRole !== Role.ADMIN) {
      await this.tournaments.getOwnedTournament(tournamentId, actorId);
    } else {
      const tour = await this.prisma.client.tournament.findUnique({
        where: { id: tournamentId },
      });
      if (!tour) {
        throw new NotFoundException('Không tìm thấy giải đấu.');
      }
    }

    if (dto.categoryId) {
      const category = await this.prisma.client.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category || category.tournamentId !== tournamentId) {
        throw new BadRequestException(
          'Hạng mục không tồn tại hoặc không thuộc giải đấu này.',
        );
      }
    }

    const created = await this.prisma.client.ruleDocument.create({
      data: {
        tournamentId,
        categoryId: dto.categoryId ?? null,
        title: dto.title,
        fileUrl: dto.fileUrl,
        mimeType: dto.mimeType,
        checksum: dto.checksum,
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    await this.recordAudit(actorId, 'RULE_DOCUMENT_CREATED', created.id);
    return created;
  }

  async list(
    tournamentId: number,
    query: RuleDocumentListQueryDto,
    actorId?: number,
  ) {
    await this.tournaments.getById(tournamentId, actorId);
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);

    const where: any = { tournamentId };
    if (query.categoryId) {
      where.categoryId = query.categoryId;
    } else if (query.isGeneral) {
      where.categoryId = null;
    }

    if (query.search) {
      where.title = { contains: query.search, mode: 'insensitive' };
    }

    const [items, total] = await this.prisma.client.$transaction([
      this.prisma.client.ruleDocument.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          category: { select: { id: true, name: true } },
        },
      }),
      this.prisma.client.ruleDocument.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getById(id: number, actorId?: number) {
    const doc = await this.prisma.client.ruleDocument.findUnique({
      where: { id },
      include: {
        tournament: {
          select: { id: true, name: true, organizerId: true, status: true },
        },
        category: { select: { id: true, name: true } },
      },
    });

    if (!doc) {
      throw new NotFoundException('Không tìm thấy tài liệu thể lệ.');
    }

    if (
      doc.tournament.status === TournamentStatus.DRAFT &&
      doc.tournament.organizerId !== actorId
    ) {
      throw new NotFoundException('Không tìm thấy tài liệu thể lệ.');
    }

    return doc;
  }

  async update(
    id: number,
    actorId: number,
    actorRole: Role,
    dto: UpdateRuleDocumentDto,
  ) {
    const doc = await this.prisma.client.ruleDocument.findUnique({
      where: { id },
    });
    if (!doc) {
      throw new NotFoundException('Không tìm thấy tài liệu thể lệ.');
    }

    if (actorRole !== Role.ADMIN) {
      await this.tournaments.getOwnedTournament(doc.tournamentId, actorId);
    }

    if (dto.categoryId !== undefined && dto.categoryId !== doc.categoryId) {
      if (dto.categoryId !== null) {
        const cat = await this.prisma.client.category.findUnique({
          where: { id: dto.categoryId },
        });
        if (!cat || cat.tournamentId !== doc.tournamentId) {
          throw new BadRequestException(
            'Hạng mục không tồn tại hoặc không thuộc giải đấu này.',
          );
        }
      }
    }

    const updated = await this.prisma.client.ruleDocument.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.fileUrl !== undefined ? { fileUrl: dto.fileUrl } : {}),
        ...(dto.mimeType !== undefined ? { mimeType: dto.mimeType } : {}),
        ...(dto.checksum !== undefined ? { checksum: dto.checksum } : {}),
        ...(dto.categoryId !== undefined
          ? { categoryId: dto.categoryId }
          : {}),
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    await this.recordAudit(actorId, 'RULE_DOCUMENT_UPDATED', updated.id);
    return updated;
  }

  async delete(id: number, actorId: number, actorRole: Role) {
    const doc = await this.prisma.client.ruleDocument.findUnique({
      where: { id },
    });
    if (!doc) {
      throw new NotFoundException('Không tìm thấy tài liệu thể lệ.');
    }

    if (actorRole !== Role.ADMIN) {
      await this.tournaments.getOwnedTournament(doc.tournamentId, actorId);
    }

    await this.prisma.client.ruleDocument.delete({ where: { id } });
    await this.recordAudit(actorId, 'RULE_DOCUMENT_DELETED', id);
    return { id };
  }

  private async recordAudit(
    actorId: number,
    action: string,
    entityId: number,
  ) {
    await this.prisma.client.auditLog.create({
      data: {
        actorId,
        action,
        entityType: 'RuleDocument',
        entityId: String(entityId),
      },
    });
  }
}
