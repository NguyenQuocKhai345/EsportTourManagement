import { Controller, Post, Body, Request, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local/local.guard';
import { UserLoginDto, RefreshTokenDto, LogoutDto, RegisterDto } from './dto/auth.dto';
import { Public } from './decorator/public';

@Controller({
  path: 'auth',
  version: '1'
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Đăng nhập
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: UserLoginDto, @Request() req: any) {
    return this.authService.login(req.user, body.deviceId);
  }

  // Làm mới token
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refresh(body.deviceId, body.refreshToken);
  }

  // Đăng xuất
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req: any, @Body() body: LogoutDto): Promise<void> {
    await this.authService.logout(req.user.id, body.deviceId);
  }

  // Đăng xuất tất cả thiết bị
  @Post('logout-all-devices')
  @HttpCode(HttpStatus.OK)
  async logoutAllDevices(@Request() req: any): Promise<void> {
    await this.authService.logoutAllDevices(req.user.id);
  }

  // Đăng ký
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.OK)
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }
}
