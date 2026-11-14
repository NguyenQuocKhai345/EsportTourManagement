import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { Role, UserStatus } from '../../generated/prisma/enums';

export class UpdateUserDto {
    @ApiPropertyOptional({ example: 'Nguyễn Văn B' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ example: '0912345678' })
    @IsOptional()
    @IsString()
    @Matches(/^[0-9]{10}$/, { message: 'Số điện thoại không hợp lệ' })
    phone?: string;

    @ApiPropertyOptional({ example: 'new_email@example.com' })
    @IsOptional()
    @IsEmail({}, { message: 'Email không hợp lệ' })
    email?: string;

    @ApiPropertyOptional({ example: '654321' })
    @IsOptional()
    @IsString()
    @Matches(/^[0-9]{6}$/, { message: 'Mật khẩu phải gồm 6 chữ số' })
    password?: string;

    @ApiPropertyOptional({ enum: Role })
    @IsOptional()
    @IsEnum(Role, { message: 'Vai trò không hợp lệ' })
    role?: Role;

    @ApiPropertyOptional({ enum: UserStatus })
    @IsOptional()
    @IsEnum(UserStatus, { message: 'Trạng thái không hợp lệ' })
    status?: UserStatus;
}