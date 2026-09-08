import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { BulkDeleteDto, ChangeStatusDto, UpdateRoleDto } from './dto/update-role.dto';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class RolesService {
    constructor(private prisma: PrismaService) { }

    // ============================================================
    // CREATE
    // ============================================================

    async create(createRoleDto: CreateRoleDto) {
        try {
            // Check tên Role đã tồn tại chưa
            const existRole = await this.prisma.role.findUnique({
                where: { name: createRoleDto.name }
            });
            if (existRole) {
                throw new BadRequestException('Tên vai trò đã tồn tại');
            }

            const { permissionIds = [], ...roleData } = createRoleDto;

            //check permission exist 
            if (permissionIds.length > 0) {
            const permissions = await this.prisma.permission.findMany({
                where: {
                    id: {
                        in: permissionIds,
                    },
                },
                select: {
                    id: true,
                },
            });

            if (permissions.length !== permissionIds.length) {
                throw new BadRequestException(
                    'Một hoặc nhiều quyền không tồn tại',
                );
            }
        }

            const role = await this.prisma.role.create({
                data: {
                    ...roleData,
                    permissions: permissionIds && permissionIds.length > 0
                        ? {
                            create: permissionIds.map(permissionId => ({
                                permissionId,
                            })),
                        }
                        : undefined,
                },
                include: {
                    permissions: {
                        include: {
                            permission: true,
                        },
                    },
                    _count: {
                        select: {
                            users: true,
                        },
                    },
                },
            });

            return role;
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Có lỗi xảy ra khi tạo Role');
        }
    }

    // ============================================================
    // READ - PAGINATE
    // ============================================================

    async findAllPaginate(page: number, limit: number, sortBy: string, sortOrder: 'asc' | 'desc', search?: string) {
        const allowedFields = ['name', 'createdAt'];
        const finalSortBy = allowedFields.includes(sortBy) ? sortBy : 'createdAt';

        const whereCondition: any = {
            deletedAt: null, // Soft delete: chỉ lấy các role chưa bị xoá
        };

        if (search && search.trim() !== "") {
            whereCondition.OR = [
                {
                    name: {
                        contains: search.trim(),
                        mode: 'insensitive',
                    },
                },
            ];
        }

        const skip = (page - 1) * limit;
        const take = limit;

        const [roles, totalItems] = await Promise.all([
            this.prisma.role.findMany({
                where: whereCondition,
                skip,
                take,
                orderBy: {
                    [finalSortBy]: sortOrder,
                },
                include: {
                    permissions: {
                        include: {
                            permission: true,
                        },
                    },
                    _count: {
                        select: {
                            users: true,
                        },
                    },
                },
            }),
            this.prisma.role.count({
                where: whereCondition,
            }),
        ]);

        const totalPages = Math.ceil(totalItems / take);
        return { roles, totalItems, totalPages };
    }

    // ============================================================
    // READ - ALL (không phân trang, dùng cho dropdown / select)
    // ============================================================

    async findAll() {
        try {
            return this.prisma.role.findMany({
                where: {
                    deletedAt: null,
                },
                include: {
                    permissions: {
                        include: {
                            permission: true,
                        },
                    },
                    _count: {
                        select: {
                            users: true,
                        },
                    },
                },
            });
        } catch (error) {
            throw error;
        }
    }

    // ============================================================
    // READ - ONE
    // ============================================================

    async findOne(id: number) {
        const role = await this.prisma.role.findUnique({
            where: { id, deletedAt: null },
            include: {
                permissions: {
                    include: {
                        permission: true,
                    },
                },
                _count: {
                    select: {
                        users: true,
                    },
                },
            },
        });

        if (!role) {
            throw new NotFoundException('Không tìm thấy vai trò');
        }

        return role;
    }

    // ============================================================
    // UPDATE
    // ============================================================

    async update(id: number, updateRoleDto: UpdateRoleDto) {
        try {
            const role = await this.prisma.role.findUnique({
                where: { id, deletedAt: null },
                include: {
                    _count: {
                        select: { users: true },
                    },
                },
            });

            if (!role) {
                throw new NotFoundException('Không tìm thấy vai trò');
            }

            // Nếu là system role thì không cho sửa tên
            if (role.isSystemRole && updateRoleDto.name && updateRoleDto.name !== role.name) {
                throw new BadRequestException('Không thể đổi tên vai trò hệ thống');
            }

            // Check tên trùng (nếu đổi tên)
            if (updateRoleDto.name && updateRoleDto.name !== role.name) {
                const existRole = await this.prisma.role.findUnique({
                    where: { name: updateRoleDto.name },
                });
                if (existRole) {
                    throw new BadRequestException('Tên vai trò đã tồn tại');
                }
            }

            const { permissionIds, ...roleData } = updateRoleDto;

            // Dùng transaction để đảm bảo tính nhất quán
            const updatedRole = await this.prisma.$transaction(async (tx) => {
                // Cập nhật thông tin role
                const updated = await tx.role.update({
                    where: { id },
                    data: roleData,
                });

                // Nếu có truyền permissionIds thì cập nhật lại danh sách quyền
                if (permissionIds !== undefined) {
                    // Xoá toàn bộ quyền cũ
                    await tx.rolePermission.deleteMany({
                        where: { roleId: id },
                    });

                    // Gán quyền mới
                    if (permissionIds.length > 0) {
                        await tx.rolePermission.createMany({
                            data: permissionIds.map(permissionId => ({
                                roleId: id,
                                permissionId,
                            })),
                        });
                    }
                }

                // Trả về role đã cập nhật kèm permissions
                return tx.role.findUnique({
                    where: { id },
                    include: {
                        permissions: {
                            include: {
                                permission: true,
                            },
                        },
                        _count: {
                            select: { users: true },
                        },
                    },
                });
            });

            return updatedRole;
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Có lỗi xảy ra khi cập nhật Role');
        }
    }

    // ============================================================
    // DELETE (Soft Delete)
    // ============================================================

    async remove(id: number) {
        try {
            const role = await this.prisma.role.findUnique({
                where: { id, deletedAt: null },
                include: {
                    _count: {
                        select: { users: true },
                    },
                },
            });

            if (!role) {
                throw new NotFoundException('Không tìm thấy vai trò');
            }

            if (role.isSystemRole) {
                throw new BadRequestException('Không thể xoá vai trò hệ thống');
            }

            if (role._count.users > 0) {
                throw new BadRequestException('Không thể xoá vai trò đang có người dùng sử dụng');
            }

            // Soft delete
            return await this.prisma.role.update({
                where: { id },
                data: { deletedAt: new Date() },
            });
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Có lỗi xảy ra khi xoá Role');
        }
    }

    // ============================================================
    // CHANGE STATUS (isSystemRole toggle — tuỳ nghiệp vụ)
    // ============================================================

    async changeStatus(changeStatusDto: ChangeStatusDto) {
        try {
            const { id, status } = changeStatusDto;

            const role = await this.prisma.role.findUnique({
                where: { id, deletedAt: null },
            });

            if (!role) {
                throw new NotFoundException('Không tìm thấy vai trò');
            }

            if (role.isSystemRole === status) {
                return { id: role.id };
            }

            const updatedRole = await this.prisma.role.update({
                where: { id },
                data: { isSystemRole: status },
            });

            return {
                id: updatedRole.id,
                name: updatedRole.name,
            };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Có lỗi xảy ra khi thay đổi trạng thái');
        }
    }

    // ============================================================
    // BULK DELETE (Soft Delete)
    // ============================================================

    async bulkDelete(bulkDeleteDto: BulkDeleteDto) {
        try {
            const { ids } = bulkDeleteDto;

            const roles = await this.prisma.role.findMany({
                where: {
                    id: { in: ids },
                    deletedAt: null,
                },
                include: {
                    _count: {
                        select: { users: true },
                    },
                },
            });

            if (roles.length === 0) {
                throw new NotFoundException('Không tìm thấy vai trò nào để xoá');
            }

            // Kiểm tra system role
            const systemRoles = roles.filter(r => r.isSystemRole);
            if (systemRoles.length > 0) {
                const names = systemRoles.map(r => r.name).join(', ');
                throw new BadRequestException(`Không thể xoá các vai trò hệ thống: ${names}`);
            }

            // Kiểm tra role đang có user
            const rolesInUse = roles.filter(r => r._count.users > 0);
            if (rolesInUse.length > 0) {
                const names = rolesInUse.map(r => r.name).join(', ');
                throw new BadRequestException(`Không thể xoá các vai trò đang có người dùng: ${names}`);
            }

            // Soft delete
            const result = await this.prisma.role.updateMany({
                where: {
                    id: { in: ids },
                },
                data: {
                    deletedAt: new Date(),
                },
            });

            return { count: result.count };
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Có lỗi xảy ra khi xoá Role');
        }
    }
}
