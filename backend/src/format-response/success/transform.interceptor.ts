import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_MESSAGE } from './message-decorator';

export interface Response<T> {
    success: true;
    statusCode: number;
    message: string;
    data?: any;
}

@Injectable()
export class TransformInterceptor<T>
    implements NestInterceptor<T, Response<T>> {
    constructor(private reflector: Reflector) {}
    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<Response<T>> {
        return next
        .handle()
        .pipe(
            map((data) => {
                const message = this.reflector.get<string>(
                    RESPONSE_MESSAGE,
                    context.getHandler(),
                ) || '';

                const statusCode = context.switchToHttp().getResponse().statusCode;

                const hasData = data !== null && data !== undefined;

                return {
                    success: true,
                    statusCode,
                    message,
                    ...(hasData ? { data } : {}),
                };
            }),
        );
    }
}
