import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTeamDto {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['0912345678', '0923456789'],
    description:
      'Số điện thoại của các đồng đội khác; captain được lấy từ tài khoản đăng nhập.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @Matches(/^[0-9]{10}$/, {
    each: true,
    message: 'Mỗi số điện thoại phải gồm đúng 10 chữ số.',
  })
  memberPhones?: string[];
}

export class UpdateTeamDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ maxLength: 20, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  tag?: string | null;

  @ApiPropertyOptional({ maxLength: 2048, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  logoUrl?: string | null;
}

export class AddTeamMemberDto {
  @ApiProperty({ example: '0912345678' })
  @IsString()
  @Matches(/^[0-9]{10}$/, {
    message: 'Số điện thoại phải gồm đúng 10 chữ số.',
  })
  phone: string;
}

export class ChangeTeamCaptainDto {
  @ApiProperty({ example: '0912345678' })
  @IsString()
  @Matches(/^[0-9]{10}$/, {
    message: 'Số điện thoại phải gồm đúng 10 chữ số.',
  })
  phone: string;
}

export class TeamListQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
