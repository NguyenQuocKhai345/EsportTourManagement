import { Injectable } from '@nestjs/common';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '../../format-response/errors/error';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGameDto, UpdateGameDto } from './dto/game.dto';

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(includeInactive = false) {
    return this.prisma.client.game.findMany({
      where: includeInactive ? undefined : { isActive: true },
      ...(!includeInactive
        ? { select: { id: true, name: true, slug: true, description: true } }
        : {}),
      orderBy: { name: 'asc' },
    });
  }

  async getById(id: number, includeInactive = false) {
    const game = await this.prisma.client.game.findFirst({
      where: { id, ...(includeInactive ? {} : { isActive: true }) },
    });
    if (!game) {
      throw new NotFoundException('Không tìm thấy trò chơi.');
    }
    return game;
  }

  async create(input: CreateGameDto) {
    const name = input.name.trim();
    const slug = input.slug.trim();
    this.validateRequiredText(name, 'Tên trò chơi');
    this.validateRequiredText(slug, 'Slug trò chơi');

    try {
      return await this.prisma.client.game.create({
        data: {
          name,
          slug,
          description: input.description,
        },
      });
    } catch (error: any) {
      this.handlePrismaError(error);
    }
  }

  async update(id: number, input: UpdateGameDto) {
    await this.getById(id, true);

    if (input.name !== undefined) {
      this.validateRequiredText(input.name.trim(), 'Tên trò chơi');
    }
    if (input.slug !== undefined) {
      this.validateRequiredText(input.slug.trim(), 'Slug trò chơi');
    }

    if (input.isActive === false) {
      const categoryCount = await this.prisma.client.category.count({
        where: { gameId: id },
      });
      if (categoryCount > 0) {
        throw new ConflictException(
          'Không thể ngừng hoạt động trò chơi đang được hạng mục tham chiếu.',
        );
      }
    }

    try {
      return await this.prisma.client.game.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.slug !== undefined ? { slug: input.slug.trim() } : {}),
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        },
      });
    } catch (error: any) {
      this.handlePrismaError(error);
    }
  }

  private validateRequiredText(value: string, fieldName: string) {
    if (!value) {
      throw new BadRequestException(`${fieldName} không được để trống.`);
    }
  }

  private handlePrismaError(error: any): never {
    if (error?.code === 'P2002') {
      throw new ConflictException('Tên hoặc slug trò chơi đã tồn tại.');
    }
    if (error?.code === 'P2025') {
      throw new NotFoundException('Không tìm thấy trò chơi.');
    }
    throw error;
  }
}
