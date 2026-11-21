import { Injectable } from '@nestjs/common';
import * as argon from 'argon2';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '../../format-response/errors/error';
import { RevokedReason } from '../../generated/prisma/enums';
import { UserInfo, UserValidate } from '../../interfaces';
import { PrismaService } from '../../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

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

  async getProfile(id: number) {
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
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');
    return user;
  }

  async updateProfile(id: number, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, phone: true },
    });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');
    if (
      dto.phone &&
      dto.phone !== user.phone &&
      (await this.prisma.user.findUnique({ where: { phone: dto.phone } }))
    ) {
      throw new ConflictException(
        'Số điện thoại đã được sử dụng bởi tài khoản khác',
      );
    }
    if (
      dto.email &&
      dto.email !== user.email &&
      (await this.prisma.user.findUnique({ where: { email: dto.email } }))
    ) {
      throw new ConflictException('Email đã được sử dụng bởi tài khoản khác');
    }
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
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
  }

  async changePassword(id: number, dto: ChangePasswordDto): Promise<null> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException(
        'Mật khẩu mới và xác nhận mật khẩu không khớp',
      );
    }
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, password: true },
    });
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }
    if (!(await argon.verify(user.password, dto.currentPassword))) {
      throw new BadRequestException('Mật khẩu hiện tại không chính xác');
    }
    const password = await argon.hash(dto.newPassword);
    await this.prisma.client.$transaction([
      this.prisma.user.update({ where: { id }, data: { password } }),
      this.prisma.refreshToken.updateMany({
        where: { userId: id, revoked: false },
        data: {
          revoked: true,
          revokedAt: new Date(),
          revokedReason: RevokedReason.ADMIN_REVOKED,
        },
      }),
    ]);
    return null;
  }
}
