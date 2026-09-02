
import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import {
    PERMISSIONS_KEY,
} from '../../decorator/permissions.decorator';
import { AuthorizationService } from '../authorization.service';

@Injectable()
export class PermissionGuard
    implements CanActivate {

    constructor(
        private readonly reflector: Reflector,
        private readonly authorizationService:
            AuthorizationService,
    ) { }

    async canActivate(
        context: ExecutionContext,
    ): Promise<boolean> {

        const requiredPermissions =
            this.reflector.getAllAndOverride<string[]>(
                PERMISSIONS_KEY,
                [
                    context.getHandler(),
                    context.getClass(),
                ],
            );

        if (!requiredPermissions?.length) {
            return true;
        }

        const request =
            context.switchToHttp().getRequest();

        const user = request.user;
        const userId = user?.id ?? user?.userId ?? user?.sub;

        if (!user || !userId) {
            return false;
        }

        const userPermissions =
            await this.authorizationService
                .getUserPermissions(userId);

        const hasPermission =
            requiredPermissions.every(
                permission =>
                    userPermissions.includes(permission),
            );

        if (!hasPermission) {
            throw new ForbiddenException(
                'Bạn không có quyền truy cập vào tài nguyên này',
            );
        }

        return true;
    }
}