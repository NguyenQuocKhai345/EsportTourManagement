import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Role, UserStatus } from '../../generated/prisma/enums';

export class QueryUserDto {
    @ApiPropertyOptional({ default: 1, description: 'Số trang' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ default: 10, description: 'Số bản ghi trên mỗi trang' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;

    @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm theo tên, số điện thoại hoặc email' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ enum: Role, description: 'Lọc theo vai trò' })
    @IsOptional()
    @IsEnum(Role)
    role?: Role;

    @ApiPropertyOptional({ enum: UserStatus, description: 'Lọc theo trạng thái' })
    @IsOptional()
    @IsEnum(UserStatus)
    status?: UserStatus;

    @ApiPropertyOptional({ enum: ['id', 'createdAt', 'name'], default: 'createdAt' })
    @IsOptional()
    @IsString()
    sortBy?: 'id' | 'createdAt' | 'name' = 'createdAt';

    @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
    @IsOptional()
    @IsString()
    sortOrder?: 'asc' | 'desc' = 'desc';
}