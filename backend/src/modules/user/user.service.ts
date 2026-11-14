import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserInfo, UserValidate } from '../../interfaces';
import { CreateUserDto } from './create-user.dto';
import { UpdateUserDto } from './update-user.dto';
import { QueryUserDto } from './query-user.dto';
import { BadRequestException, ConflictException, NotFoundException } from '../../format-response/errors/error';
import * as argon from 'argon2';
import { RevokedReason, UserStatus } from '../../generated/prisma/enums';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== CÁC HÀM CHO AUTH ====================

  // Tìm User theo số điện thoại và trả về thông tin cần thiết để xác thực
  async findUserValidate(phone: string): Promise<UserValidate | null> {
    return this.prisma.user.findUnique({
      where: { phone },
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        status: true,
        role: true,
        password: true,
      },
    });
  }

  // Tìm User theo id
  async findUserById(id: number): Promise<UserInfo | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        status: true,
        role: true,
      },
    });
  }

  // ==================== CRUD CHO ADMIN ====================

  // 1. Tạo mới User
  async create(dto: CreateUserDto) {
    const existPhone = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (existPhone) {
      throw new ConflictException('Số điện thoại đã tồn tại trên hệ thống');
    }

    const existEmail = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existEmail) {
      throw new ConflictException('Email đã tồn tại trên hệ thống');
    }

    const hashedPassword = await argon.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        password: hashedPassword,
        role: dto.role,
        status: dto.status ?? UserStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  // 2. Lấy danh sách Users (phân trang, tìm kiếm, lọc)
  async findAll(query: QueryUserDto) {
    const { page = 1, limit = 10, search, role, status, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 3. Xem chi tiết User
  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID: ${id}`);
    }

    return user;
  }

  // 4. Cập nhật User
  async update(id: number, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID: ${id}`);
    }

    if (dto.phone && dto.phone !== user.phone) {
      const existPhone = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
      if (existPhone) {
        throw new ConflictException('Số điện thoại đã được sử dụng bởi tài khoản khác');
      }
    }

    if (dto.email && dto.email !== user.email) {
      const existEmail = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existEmail) {
        throw new ConflictException('Email đã được sử dụng bởi tài khoản khác');
      }
    }

    const updateData: any = { ...dto };

    if (dto.password) {
      updateData.password = await argon.hash(dto.password);
    }

    if (dto.status === UserStatus.BLOCKED) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: id, revoked: false },
        data: {
          revoked: true,
          revokedAt: new Date(),
          revokedReason: RevokedReason.ADMIN_REVOKED,
        },
      });
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  // 5. Xóa User
  async remove(id: number, currentAdminId: number) {
    if (id === currentAdminId) {
      throw new BadRequestException('Bạn không thể tự xóa tài khoản quản trị của chính mình');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID: ${id}`);
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return null;
  }
}
