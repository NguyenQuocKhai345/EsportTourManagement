import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserInfo } from '../../interfaces';
import { UserService } from '../../modules/user/user.service';
import { UnauthorizedException } from '../../format-response/errors/error';
import { UserStatus } from '../../generated/prisma/enums';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_USER_SECRET'),
    });
  }

  async validate(payload: { sub: number }): Promise<UserInfo> {
    const user = await this.userService.findUserById(payload.sub);
    if (!user || user.status === UserStatus.BLOCKED) {
      throw new UnauthorizedException('Tài khoản không hợp lệ');
    }

    return user;
  }
}
