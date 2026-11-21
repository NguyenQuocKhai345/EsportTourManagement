import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from '../../format-response/success/message-decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserService } from './user.service';

@ApiTags('User Profile')
@ApiBearerAuth('accessToken')
@Controller({ path: 'users', version: '1' })
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile/me')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Lấy hồ sơ thành công')
  @ApiOperation({ summary: 'Lấy hồ sơ của tài khoản đang đăng nhập' })
  getMyProfile(@Request() req: any) {
    return this.userService.getProfile(req.user.id);
  }

  @Patch('profile/me')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Cập nhật hồ sơ thành công')
  @ApiOperation({ summary: 'Cập nhật hồ sơ của tài khoản đang đăng nhập' })
  updateMyProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.userService.updateProfile(req.user.id, dto);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đổi mật khẩu thành công')
  @ApiOperation({ summary: 'Đổi mật khẩu tài khoản đang đăng nhập' })
  changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return this.userService.changePassword(req.user.id, dto);
  }
}
