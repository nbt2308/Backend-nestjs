import { RESPONSE_MESSAGE } from '../decorator/responseMessage.decorator';
import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
export const SKIP_TRANSFORM_KEY = 'skipTransform';
export interface Response<T> {
    statusCode: number;
    message?: string;
    data: any;
}
export const SkipTransform = () =>
    SetMetadata(SKIP_TRANSFORM_KEY, true);

@Injectable()
export class TransformInterceptor<T>
    implements NestInterceptor<T, Response<T>> {
    constructor(private reflector: Reflector) { }

    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<Response<T>> {

        const skipTransform = this.reflector.getAllAndOverride<boolean>(
            SKIP_TRANSFORM_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (skipTransform) {
            return next.handle() as Observable<any>;
        }
        return next
            .handle()
            .pipe(
                map((data) => ({
                    statusCode: context.switchToHttp().getResponse().statusCode,
                    message: this.reflector
                        .get<string>(RESPONSE_MESSAGE, context.getHandler()) || '',
                    data: data
                })),
            );
    }
}
