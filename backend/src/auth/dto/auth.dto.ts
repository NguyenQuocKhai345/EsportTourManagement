import { IsIn, IsNotEmpty, IsString, Matches, ValidateIf } from 'class-validator';
import { Role } from '../../generated/prisma/enums';

export class UserLoginDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{10}$/, { message: 'Số điện thoại không hợp lệ' })
  phone: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{6}$/, { message: 'Mật khẩu không hợp lệ' })
  password: string;

  @IsString()
  @IsNotEmpty()
  deviceId: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;

  @IsString()
  @IsNotEmpty()
  deviceId: string;
}

export class LogoutDto {
  @IsString()
  @IsNotEmpty()
  deviceId: string;
}

export class RegisterDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn([Role.BTC, Role.PLAYER, Role.REFEREE])
  role?: Role;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{10}$/, { message: 'Số điện thoại không hợp lệ' })
  phone: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{6}$/, { message: 'Mật khẩu không hợp lệ' })
  password: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{6}$/, { message: 'Xác nhận mật khẩu không hợp lệ' })
  confirmPassword: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, { message: 'Email không hợp lệ' })
  email: string;

  @IsString()
  @IsNotEmpty()
  deviceId: string;
}
