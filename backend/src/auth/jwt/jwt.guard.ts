import { ExecutionContext, Injectable } from '@nestjs/common';
import { UnauthorizedException } from '../../format-response/errors/error';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorator/public';
import { Reflector } from '@nestjs/core';
@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      const request = context.switchToHttp().getRequest();
      const authorization = request.headers?.authorization;
      // Public reads stay anonymous by default but can use an optional bearer token
      // for resource visibility rules such as an organizer viewing their DRAFT.
      return authorization?.startsWith('Bearer ')
        ? super.canActivate(context)
        : true;
    }
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('AccessToken invalid');
    }
    return user;
  }
}
