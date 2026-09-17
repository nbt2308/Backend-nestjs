
import { AuthGuard } from '@nestjs/passport';
import {
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { IS_PUBLIC_KEY } from '@/decorator/public.decorator';
import { Reflector } from '@nestjs/core';
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private reflector: Reflector) {
        super();
    }
    canActivate(context: ExecutionContext) {
        // Add your custom authentication logic here
        // for example, call super.logIn(request) to establish a session.
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            // Vẫn cố gắng parse JWT để lấy user (nếu có token)
            // Nhưng không throw lỗi nếu không có token hoặc token hết hạn
            return super.canActivate(context);
        }
        return super.canActivate(context);
    }

    handleRequest(err, user, info,context:ExecutionContext) {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        // Nếu route là public, không throw lỗi khi không có user
        if (isPublic) {
            return user || null;
        }
        // Route bảo vệ: throw lỗi nếu không có user
        // Nếu không có lỗi và có user -> trả về user
        // Nếu có lỗi hoặc không có user -> trả về null (không throw lỗi)
        if (err || !user) {
            return null;
        }
        return user;
    }
}
