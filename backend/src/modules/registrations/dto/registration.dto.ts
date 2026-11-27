import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { RegistrationStatus } from '../../../generated/prisma/enums';

export class SubmitRegistrationDto {
  @ApiPropertyOptional({
    description: 'Thông tin hồ sơ bổ sung dạng JSON (ghi chú, số điện thoại liên hệ,...)',
    example: { contactPhone: '0987654321', note: 'Đội sẵn sàng thi đấu' },
  })
  @IsOptional()
  @IsObject()
  application?: Record<string, any>;
}

export class ReviewRegistrationDto {
  @ApiPropertyOptional({
    description: 'Ghi chú hoặc lý do phê duyệt / từ chối của BTC',
    example: 'Hồ sơ đầy đủ điều kiện hoặc thiếu thông tin tuyển thủ',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reviewNote?: string;
}

export class RegistrationListQueryDto {
  @ApiPropertyOptional({ default: 1, description: 'Số trang' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, description: 'Số bản ghi trên mỗi trang' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Lọc theo ID hạng mục thi đấu' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @ApiPropertyOptional({
    enum: RegistrationStatus,
    description: 'Lọc theo trạng thái hồ sơ (PENDING, APPROVED, REJECTED, WITHDRAWN)',
  })
  @IsOptional()
  @IsEnum(RegistrationStatus)
  status?: RegistrationStatus;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo tên đội hoặc tag đội' })
  @IsOptional()
  @IsString()
  search?: string;
}
