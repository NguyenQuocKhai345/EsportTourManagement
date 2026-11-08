import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserInfo, UserValidate } from '../../interfaces';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  // Tìm User theo số điện thoại và trả về thông tin cần thiết để xác thực
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

  // Tìm User theo id
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
}
