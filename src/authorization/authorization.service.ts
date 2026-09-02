import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthorizationService {

    constructor(
        private readonly prisma: PrismaService,
    ) { }

    async getUserPermissions(userId: string): Promise<string[]> {
        if (!userId) {
            return [];
        }

        const userRoles =
            await this.prisma.userRole.findMany({
                where: {
                    userId,
                },
                include: {
                    role: {
                        include: {
                            permissions: {
                                include: {
                                    permission: true,
                                },
                            },
                        },
                    },
                },
            });

        const permissions =
            userRoles.flatMap(
                userRole =>
                    userRole.role.permissions.map(
                        rolePermission =>
                            rolePermission.permission.name,
                    ),
            );

        return [...new Set(permissions)];
    }
    async hasRole(userId: string, roleName: string,): Promise<boolean> {

        const count =
            await this.prisma.userRole.count({
                where: {
                    userId,
                    role: {
                        name: roleName,
                    },
                },
            });

        return count > 0;
    }

    async hasPermission(userId: string, permission: string,): Promise<boolean> {

        const count =
            await this.prisma.userRole.count({
                where: {
                    userId,
                    role: {
                        permissions: {
                            some: {
                                permission: {
                                    name: permission,
                                },
                            },
                        },
                    },
                },
            });

        return count > 0;
    }
}
