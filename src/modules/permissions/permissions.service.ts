import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class PermissionsService {
    constructor(private prisma: PrismaService) { }

    /**
     * Lấy tất cả permissions, nhóm theo resource
     */
    async findAll() {
        const permissions = await this.prisma.permission.findMany({
            orderBy: [
                { resource: 'asc' },
                { name: 'asc' },
            ],
        });

        return permissions;
    }

    async findAllPaginate(page: number, limit: number, sortBy: string, sortOrder: 'asc' | 'desc', search?: string) {
        const allowedFields = ['name', 'label', 'resource'];
        const finalSortBy = allowedFields.includes(sortBy) ? sortBy : 'name';

        const whereCondition: any = {};

        if (search && search.trim() !== "") {
            whereCondition.OR = [
                {
                    name: {
                        contains: search.trim(),
                        mode: 'insensitive',
                    },
                },
                {
                    resource: {
                        contains: search.trim(),
                        mode: 'insensitive',
                    },
                },
                {
                    label: {
                        contains: search.trim(),
                        mode: 'insensitive',
                    },
                },
            ];
        }

        const skip = (page - 1) * limit;
        const take = limit;

        const [permissions, totalItems] = await Promise.all([
            this.prisma.permission.findMany({
                where: whereCondition,
                skip,
                take,
                orderBy: {
                    [finalSortBy]: sortOrder,
                },
            }),
            this.prisma.permission.count({
                where: whereCondition,
            }),
        ]);

        const totalPages = Math.ceil(totalItems / take);
        return { permissions, totalItems, totalPages };
    }
    /**
     * Lấy tất cả permissions đã được nhóm sẵn theo resource
     */
    async findAllGrouped() {
        const GROUP_ORDER = [
            "Hệ thống (System)",
            "Người dùng & Vai trò",
            "Khoá học (Course)",
            "Chương học (Section)",
            "Bài học (Lesson)",
            "Nhãn (Tag)",
            "Ghi danh (Enrollment)",
            "Danh sách yêu thích",
            "Đơn hàng (Order)",
            "Bài viết (Post)",
            "Bình luận khoá học",
            "Bình luận bài viết",
            "Media & File",
            "Tương tác (Like/Dislike)",
        ];
        const permissions = await this.prisma.permission.findMany({
            orderBy: [
                { resource: 'asc' },
                { name: 'asc' },
            ],
        });

        // Nhóm theo resource
        const grouped = permissions.reduce((acc: Record<string, any[]>, perm) => {
            const resource = perm.resource || 'other';
            if (!acc[resource]) {
                acc[resource] = [];
            }
            acc[resource].push(perm);
            return acc;
        }, {});

        const orderedGrouped: Record<string, any[]> = {};

        for (const resource of GROUP_ORDER) {
            if (grouped[resource]) {
                orderedGrouped[resource] = grouped[resource];
            }
        }

        // Những resource chưa định nghĩa thứ tự → đưa xuống cuối
        for (const resource of Object.keys(grouped)) {
            if (!orderedGrouped[resource]) {
                orderedGrouped[resource] = grouped[resource];
            }
        }

        return orderedGrouped;
    }
}
