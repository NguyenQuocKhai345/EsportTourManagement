import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { Role, UserStatus } from '../../generated/prisma/enums';

export class CreateUserDto {
    @ApiProperty({ example: 'Nguyễn Văn A', description: 'Họ và tên người dùng' })
    @IsString()
    @IsNotEmpty({ message: 'Tên không được để trống' })
    name: string;

    @ApiProperty({ example: '0987654321', description: 'Số điện thoại 10 chữ số' })
    @IsString()
    @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
    @Matches(/^[0-9]{10}$/, { message: 'Số điện thoại không hợp lệ (phải gồm 10 chữ số)' })
    phone: string;

    @ApiProperty({ example: 'user@example.com', description: 'Email người dùng' })
    @IsEmail({}, { message: 'Email không hợp lệ' })
    @IsNotEmpty({ message: 'Email không được để trống' })
    email: string;

    @ApiProperty({ example: '123456', description: 'Mật khẩu (mặc định 6 chữ số theo chuẩn auth hiện tại)' })
    @IsString()
    @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
    @Matches(/^[0-9]{6}$/, { message: 'Mật khẩu phải gồm 6 chữ số' })
    password: string;

    @ApiProperty({ enum: Role, default: Role.PLAYER, description: 'Vai trò trong hệ thống' })
    @IsEnum(Role, { message: 'Vai trò không hợp lệ' })
    role: Role;

    @ApiPropertyOptional({ enum: UserStatus, default: UserStatus.ACTIVE, description: 'Trạng thái tài khoản' })
    @IsOptional()
    @IsEnum(UserStatus, { message: 'Trạng thái không hợp lệ' })
    status?: UserStatus;
}