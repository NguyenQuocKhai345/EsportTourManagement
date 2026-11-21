import { IsIn, IsNotEmpty, IsString, Matches, ValidateIf } from 'class-validator';
import { Role } from '../../generated/prisma/enums';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s])\S{8,}$/;
const PASSWORD_ERROR =
  'Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt';

export class UserLoginDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{10}$/, { message: 'Số điện thoại không hợp lệ' })
  phone: string;

  @IsString()
  @IsNotEmpty()
  @Matches(PASSWORD_REGEX, { message: PASSWORD_ERROR })
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
  @Matches(PASSWORD_REGEX, { message: PASSWORD_ERROR })
  password: string;

  @IsString()
  @IsNotEmpty()
  @Matches(PASSWORD_REGEX, { message: PASSWORD_ERROR })
  confirmPassword: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, { message: 'Email không hợp lệ' })
  email: string;

  @IsString()
  @IsNotEmpty()
  deviceId: string;
}
