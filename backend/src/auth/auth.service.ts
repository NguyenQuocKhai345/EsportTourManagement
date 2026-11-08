import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../modules/user/user.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, UnauthorizedException } from '../format-response/errors/error';
import * as argon from 'argon2';
import { RevokedReason, Role, UserStatus } from '../generated/prisma/enums';
import { UserAccount } from '../interfaces';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { RegisterDto,} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // Validate User để login
  async validateUser(phone: string, pass: string): Promise<UserAccount> {
    const user = await this.userService.findUserValidate(phone);
    if (!user || !user.password || user.status === UserStatus.BLOCKED)
      throw new BadRequestException('Tài khoản không tồn tại hoặc bị khóa');
    const ok = await argon.verify(user.password, pass);
    if (!ok) throw new BadRequestException('Sai mật khẩu');
    return { id: user.id, phone: user.phone, name: user.name, role: user.role };
  }

  // TẠO TOKEN
  private async generateToken(user: UserAccount)
    : Promise<{ accessToken: string; refreshToken: string }>
  {
    const payload = {
      sub: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_USER_SECRET'),
      expiresIn: this.configService.get<string>('JWT_USER_EXPIRED') as any,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_USER_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_USER_REFRESH_EXPIRED') as any,
    });
    return {
      accessToken: accessToken,
      refreshToken: refreshToken
    };
  }

  // Đăng nhập
  async login(user: UserAccount, deviceId: string)
    : Promise<{ accessToken: string; refreshToken: string, user: UserAccount }>
  {
    const { accessToken, refreshToken } = await this.generateToken(user);
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const absoluteExpiredAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.upsert({
      where: { userId_deviceId: { userId: user.id, deviceId } },
      update: {
        tokenHash,
        absoluteExpiredAt,
        lastUsedAt: new Date(),
        revoked: false,
        revokedAt: null,
        revokedReason: null,
      },
      create: {
        userId: user.id,
        deviceId,
        tokenHash,
        absoluteExpiredAt,
        isCurrent: true,
      },
    });

    return {
      accessToken: accessToken,
      refreshToken: refreshToken,
      user: user
    };
  }

  // Refresh token
  async refresh(deviceId: string, refreshToken: string)
    : Promise<{ accessToken: string; refreshToken: string }>
  {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
      secret: this.configService.get<string>('JWT_USER_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Token không hợp lệ');
    }

    const userId: number = Number(payload.sub);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { userId_deviceId: { userId, deviceId } },
    });

    if (!stored || stored.revoked || stored.absoluteExpiredAt < new Date())
      throw new UnauthorizedException('Phiên đăng nhập hết hạn');

    const hash = createHash('sha256').update(refreshToken).digest('hex');
    if (hash !== stored.tokenHash)
      throw new UnauthorizedException('Token không hợp lệ');

    const user = await this.userService.findUserById(userId);
    if (!user || user.status === UserStatus.BLOCKED)
      throw new UnauthorizedException('Tài khoản không hợp lệ');

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await this.generateToken({
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
    });

    const newTokenHash = createHash('sha256').update(newRefreshToken).digest('hex');
    await this.prisma.refreshToken.update({
      where: { userId_deviceId: { userId, deviceId } },
      data: { tokenHash: newTokenHash, lastUsedAt: new Date() },
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  // Đăng xuất
  async logout(userId: number, deviceId: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { userId_deviceId: { userId, deviceId } },
      data: { revoked: true, revokedAt: new Date(), revokedReason: RevokedReason.LOGOUT },
    });
  }

  // Đăng xuất tất cả thiết bị
  async logoutAllDevices(userId: number): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true, revokedAt: new Date(), revokedReason: RevokedReason.LOGOUT },
    });
  }

  // Đăng ký tài khoản mới
  async register(body: RegisterDto)
    : Promise<{ accessToken: string; refreshToken: string, user: UserAccount }>
  {
    const { name, phone, password, confirmPassword, email, deviceId } = body;
    const role = body.role ?? Role.PLAYER;
    if (password !== confirmPassword) {
      throw new BadRequestException('Mật khẩu và xác nhận mật khẩu không khớp');
    }
    const existingUser = await this.userService.findUserValidate(phone);
    if (existingUser) {
      throw new BadRequestException('Số điện thoại đã được đăng ký');
    }

    const existingEmail = await this.prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      throw new BadRequestException('Email đã được sử dụng');
    }

    const passwordHash = await argon.hash(password);
    const newUser = await this.prisma.user.create({
      data: {
        name,
        phone,
        password: passwordHash,
        email,
        role,
        status: UserStatus.ACTIVE,
      },
    });
    const userAccount: UserAccount = {
      id: newUser.id,
      phone: newUser.phone,
      name: newUser.name,
      role: newUser.role,
    };
    return this.login(userAccount, deviceId);
  }
}
