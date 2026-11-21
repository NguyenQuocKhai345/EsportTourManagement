import { Injectable } from '@nestjs/common';
import * as argon from 'argon2';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '../../format-response/errors/error';
import { RevokedReason, UserStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    await this.ensureEmailAndPhoneAvailable(dto.email, dto.phone);
    return this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        password: await argon.hash(dto.password),
        role: dto.role,
        status: dto.status ?? UserStatus.ACTIVE,
      },
      select: SAFE_USER_SELECT,
    });
  }

  async findAll(query: QueryUserDto) {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    const where: any = {};
    if (role) where.role = role;
    if (status) where.status = status;
    if (search)
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];

    const [total, items] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: SAFE_USER_SELECT,
      }),
    ]);
    return {
      items,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: SAFE_USER_SELECT,
    });
    if (!user)
      throw new NotFoundException(`Không tìm thấy người dùng với ID: ${id}`);
    return user;
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, phone: true },
    });
    if (!user)
      throw new NotFoundException(`Không tìm thấy người dùng với ID: ${id}`);
    await this.ensureEmailAndPhoneAvailable(
      dto.email ?? user.email,
      dto.phone ?? user.phone,
      id,
    );
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      },
      select: SAFE_USER_SELECT,
    });
  }

  async updateStatus(id: number, status: UserStatus, currentAdminId: number) {
    if (id === currentAdminId && status !== UserStatus.ACTIVE) {
      throw new BadRequestException(
        'Bạn không thể tự vô hiệu hóa tài khoản quản trị của chính mình',
      );
    }
    await this.findOne(id);
    if (status !== UserStatus.ACTIVE) {
      await this.prisma.client.$transaction([
        this.prisma.user.update({
          where: { id },
          data: { status },
          select: { id: true },
        }),
        this.prisma.refreshToken.updateMany({
          where: { userId: id, revoked: false },
          data: {
            revoked: true,
            revokedAt: new Date(),
            revokedReason: RevokedReason.ADMIN_REVOKED,
          },
        }),
      ]);
      return this.findOne(id);
    }
    return this.prisma.user.update({
      where: { id },
      data: { status },
      select: SAFE_USER_SELECT,
    });
  }

  async deactivate(id: number, currentAdminId: number) {
    if (id === currentAdminId)
      throw new BadRequestException(
        'Bạn không thể tự vô hiệu hóa tài khoản quản trị của chính mình',
      );
    return this.updateStatus(id, UserStatus.INACTIVE, currentAdminId);
  }

  private async ensureEmailAndPhoneAvailable(
    email: string,
    phone: string,
    excludeId?: number,
  ) {
    const [emailOwner, phoneOwner] = await Promise.all([
      this.prisma.user.findUnique({ where: { email }, select: { id: true } }),
      this.prisma.user.findUnique({ where: { phone }, select: { id: true } }),
    ]);
    if (emailOwner && emailOwner.id !== excludeId)
      throw new ConflictException('Email đã được sử dụng bởi tài khoản khác');
    if (phoneOwner && phoneOwner.id !== excludeId)
      throw new ConflictException(
        'Số điện thoại đã được sử dụng bởi tài khoản khác',
      );
  }
}
