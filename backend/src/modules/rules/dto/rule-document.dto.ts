import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateRuleDocumentDto {
  @ApiProperty({ description: 'Tiêu đề tài liệu thể lệ', example: 'Điều lệ giải đấu tổng quan' })
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @MaxLength(200, { message: 'Tiêu đề không vượt quá 200 ký tự' })
  title: string;

  @ApiProperty({ description: 'Đường dẫn tệp tài liệu', example: 'https://storage.example.com/rules/v1.pdf' })
  @IsString()
  @IsNotEmpty({ message: 'Đường dẫn tệp không được để trống' })
  fileUrl: string;

  @ApiPropertyOptional({ description: 'MIME Type của tệp', example: 'application/pdf' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  mimeType?: string;

  @ApiPropertyOptional({ description: 'Mã kiểm tra tính toàn vẹn (checksum SHA-256)' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  checksum?: string;

  @ApiPropertyOptional({
    description: 'ID hạng mục áp dụng thể lệ riêng (bỏ trống nếu là thể lệ chung của giải)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;
}

export class UpdateRuleDocumentDto {
  @ApiPropertyOptional({ description: 'Tiêu đề mới của tài liệu thể lệ' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: 'Đường dẫn tệp tài liệu mới' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fileUrl?: string;

  @ApiPropertyOptional({ description: 'MIME Type của tệp' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  mimeType?: string;

  @ApiPropertyOptional({ description: 'Mã kiểm tra tính toàn vẹn mới' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  checksum?: string;

  @ApiPropertyOptional({
    description: 'ID hạng mục áp dụng (hoặc null nếu chuyển thành thể lệ chung)',
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number | null;
}

export class RuleDocumentListQueryDto {
  @ApiPropertyOptional({ default: 1, description: 'Số trang' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, description: 'Số bản ghi trên trang' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Lọc tài liệu theo ID hạng mục' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @ApiPropertyOptional({ description: 'Chỉ lấy thể lệ chung của giải đấu (categoryId = null)' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isGeneral?: boolean;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo tiêu đề tài liệu' })
  @IsOptional()
  @IsString()
  search?: string;
}
