import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateCourseDto } from './dto/create-course.dto';
import { BulkDeleteDto, BulkStatusDto, ChangeStatusDto, UpdateCourseDto } from './dto/update-course.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { generateSlug } from '@/helpers/slug.util';
import { uuidv7 } from 'uuidv7';
import { CourseType, Level, Prisma } from '@prisma/client';
import { normalizeNumberArray, normalizeStringArray } from '@/helpers/normalizeArray.utils';
import { AuthorizationService } from '@/authorization/authorization.service';

@Injectable()
export class CoursesService {
    constructor(private readonly prisma: PrismaService, private readonly authorizationService: AuthorizationService) { }

    async create(createCourseDto: CreateCourseDto) {
        try {
            //free
            if (createCourseDto.courseType === CourseType.FREE) {
                if (createCourseDto.price > 0 || createCourseDto.discount > 0) {
                    throw new BadRequestException('Khóa học miễn phí không được nhập giá hoặc giảm giá');
                }
            }

            //paid
            if (createCourseDto.courseType === CourseType.PAID) {
                if (createCourseDto.price <= 0) {
                    throw new BadRequestException('Khóa học trả phí phải có giá lớn hơn 0');
                }
                if (createCourseDto.discount > createCourseDto.price) {
                    throw new BadRequestException('Giá giảm không được lớn hơn giá gốc');
                }
            }
            //generate slug
            if (!createCourseDto.title || typeof createCourseDto.title !== 'string') {
                throw new BadRequestException('Tên không hợp lệ để tạo slug');
            }
            let slug = generateSlug(createCourseDto.title);
            let checkExistSlug = await this.prisma.course.findUnique({
                where: {
                    slug
                }
            })
            if (checkExistSlug) {
                slug = `${slug}-${Date.now().toString(36)}`;
            }
            const id = uuidv7();
            const { tags, ...restDto } = createCourseDto;
            const course = await this.prisma.course.create({
                data: {
                    id,
                    ...restDto,
                    slug,
                    ...(tags && tags.length > 0 && {
                        tags: {
                            connect: tags.map((tagId) => ({ id: tagId })),
                        },
                    }),
                },
                include: { tags: true },
            })
            return course;
        } catch (error) {
            console.log(error);
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Tạo khoá học thất bại');
        }
    }

    async findAll(page: number, limit: number, sortBy: string, sortOrder: 'asc' | 'desc', search?: string) {
        const allowedFields = [
            'title',
            'createdAt',
        ];
        const finalSortBy = allowedFields.includes(sortBy) ? sortBy : 'createdAt';

        const whereCondition: any = {
            deletedAt: null
        };

        if (search && search.trim() !== "") {
            whereCondition.OR = [
                {
                    name: {
                        contains: search.trim(),
                        mode: 'insensitive', // Không phân biệt chữ hoa / chữ thường (Chỉ hỗ trợ tốt trên PostgreSQL)
                    },
                },
                {
                    slug: {
                        contains: search.trim(),
                        mode: 'insensitive',
                    },
                },
                {
                    description: {
                        contains: search.trim(),
                        mode: 'insensitive',
                    },
                },
            ];
        }

        const skip = (page - 1) * limit;
        const take = limit;
        const [courses, totalItems] = await Promise.all([
            this.prisma.course.findMany({
                where: whereCondition,
                skip: skip,
                take: take,
                orderBy: {
                    [finalSortBy]: sortOrder
                },
                include: { tags: true },
            }),
            this.prisma.course.count({
                where: whereCondition
            })
        ])
        const totalPages = Math.ceil(totalItems / take);
        return { courses, totalItems, totalPages };
    }

    findOne(id: number) {
        return `This action returns a #${id} course`;
    }

    async update(id: string, userId: string, updateCourseDto: UpdateCourseDto) {
        try {

            const course = await this.prisma.course.findUnique({
                where: {
                    id: id
                }
            })
            if (!course) {
                throw new NotFoundException('Không tìm thấy khóa học')
            }
            const effectiveCourseType = updateCourseDto.courseType ?? course.courseType;
            let finalPrice = updateCourseDto.price ?? Number(course.price);
            let finalDiscount = updateCourseDto.discount ?? Number(course.discount);

            // Nếu là free -> ép giá và discount về 0
            if (effectiveCourseType === CourseType.FREE) {
                finalPrice = 0;
                finalDiscount = 0;
            }

            if (effectiveCourseType === CourseType.PAID) {
                if (Number(finalPrice) <= 0) {
                    throw new BadRequestException('Khóa học trả phí phải có giá lớn hơn 0')
                }
                if (Number(finalDiscount) > Number(finalPrice)) {
                    throw new BadRequestException('Giá giảm không được lớn hơn giá gốc')
                }
            }
            let slug = course.slug;
            if (updateCourseDto.title !== undefined && updateCourseDto.title !== course.title) {

                slug = generateSlug(updateCourseDto.title)
                let checkExistSlug = await this.prisma.course.findUnique({
                    where: {
                        slug
                    }
                })
                if (checkExistSlug) {
                    slug = `${slug}-${Date.now().toString(36)}`
                }
            }
            const { tags: tagIds, ...restUpdateDto } = updateCourseDto;

            //Ownership check 
            const isAdmin =
                await this.authorizationService.hasRole(userId, 'ADMIN');

            if (!isAdmin && course.instructorId !== userId) {

                throw new ForbiddenException('Ban không có quyền cập nhật khóa học này');
            }
            const updateCourse = await this.prisma.course.update({
                where: {
                    id: id
                },
                data: {
                    ...restUpdateDto,
                    price: finalPrice,
                    discount: finalDiscount,
                    slug,
                    ...(tagIds !== undefined && {
                        tags: {
                            set: tagIds.map((tagId) => ({ id: tagId })),
                        },
                    }),
                },
                include: { tags: true },
            })
            return updateCourse
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            if (error instanceof BadRequestException) {
                throw error;
            }
            if (error instanceof ForbiddenException) {
                throw error;
            }
            throw error;
        }
    }

    async remove(id: string) {
        try {
            const course = await this.prisma.course.findUnique({
                where: {
                    id: id
                }
            })
            if (!course) {
                throw new NotFoundException('Không tìm thấy khóa học')
            }
            const removeCourse = await this.prisma.course.delete({
                where: {
                    id: id
                }
            })
            return {
                id: removeCourse.id,
                title: removeCourse.title
            }
        }
        catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Có lỗi xảy ra khi xóa');
        }
    }
    async softDelete(userId: string, id: string) {
        try {
            const course = await this.prisma.course.findUnique({
                where: {
                    id: id
                }
            })
            if (!course) {
                throw new NotFoundException('Không tìm thấy khóa học')
            }
            const isAdmin =
                await this.authorizationService.hasRole(userId, 'ADMIN');

            if (!isAdmin && course.instructorId !== userId) {

                throw new ForbiddenException('Ban không có quyền xóa khóa học này');
            }
            const softDeleteCourse = await this.prisma.course.update({
                where: {
                    id: id
                },
                data: {
                    deletedAt: new Date()
                }
            })
            return {
                id: softDeleteCourse.id,
                title: softDeleteCourse.title
            }
        }
        catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException('Có lỗi xảy ra khi xóa');
        }
    }

    async changeStatus(userId: string, changeStatusDto: ChangeStatusDto) {
        try {
            const { id, status } = changeStatusDto;
            const course = await this.prisma.course.findUnique({
                where: {
                    id: id
                }
            })
            if (!course) {
                throw new NotFoundException('Không tìm thấy khoá học')
            }
            const isAdmin =
                await this.authorizationService.hasRole(userId, 'ADMIN');

            if (!isAdmin && course.instructorId !== userId) {

                throw new ForbiddenException('Ban không có quyền thay đổi trạng thái khóa học này');
            }
            const changeStatusCourse = await this.prisma.course.update({
                where: {
                    id: id
                },
                data: {
                    status: status
                }
            })
            return {
                id: changeStatusCourse.id,
                title: changeStatusCourse.title,
            }
        }
        catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException('Có lỗi xảy ra khi thay đổi trạng thái');
        }
    }

    async bulkStatus(userId: string, bulkStatusDto: BulkStatusDto) {
        try {
            const { ids, status } = bulkStatusDto;
            const course = await this.prisma.course.findMany({
                where: {
                    id: {
                        in: ids
                    }
                }
            })
            if (course.length === 0) {
                throw new BadRequestException('Không tìm thấy khóa học nào để cập nhật');
            }
            const isAdmin = await this.authorizationService.hasRole(userId, 'ADMIN');
            if (!isAdmin) {
                const userCourses = await this.prisma.course.findMany({
                    where: {
                        id: {
                            in: ids
                        },
                        instructorId: userId
                    }
                })
                if (userCourses.length !== ids.length) {
                    throw new ForbiddenException('Bạn không có quyền cập nhật trạng thái khóa học này');
                }
            }
            const result = await this.prisma.course.updateMany({
                where: {
                    id: {
                        in: ids
                    }
                },
                data: {
                    status: status
                }
            })
            return {
                count: result.count
            }
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException('Có lỗi xảy ra khi cập nhật trạng thái khoá học');
        }
    }

    async bulkDelete(userId: string, bulkDeleteDto: BulkDeleteDto) {
        try {
            const { ids } = bulkDeleteDto;
            const course = await this.prisma.course.findMany({
                where: {
                    id: {
                        in: ids
                    }
                }
            })
            if (course.length === 0) {
                throw new BadRequestException('Không tìm thấy khóa học nào để xóa');
            }
            const isAdmin = await this.authorizationService.hasRole(userId, 'ADMIN');
            if (!isAdmin) {
                const userCourses = await this.prisma.course.findMany({
                    where: {
                        id: {
                            in: ids
                        },
                        instructorId: userId
                    }
                })
                if (userCourses.length !== ids.length) {
                    throw new ForbiddenException('Bạn không có quyền xóa khóa học này');
                }
            }
            const result = await this.prisma.course.updateMany({
                where: {
                    id: {
                        in: ids
                    }
                },
                data: {
                    deletedAt: new Date()
                }
            })
            return {
                count: result.count
            }
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException('Có lỗi xảy ra khi xóa khoá học');
        }
    }

    async findPopularCourses(limit: number) {
        try {
            if (!limit || limit <= 0) {
                throw new BadRequestException('Số lượng khóa học phải lớn hơn 0');
            }
            const featuredCourses = await this.prisma.course.findMany({
                where: {
                    status: true,
                    deletedAt: null
                },
                orderBy: {
                    studentCount: 'desc'
                },

                take: limit,

                select: {
                    id: true,
                    title: true,
                    slug: true,
                    thumbnail: true,
                    courseType: true,
                    level: true,
                    price: true,
                    discount: true,
                    studentCount: true,
                    reviewCount: true,
                    averageRating: true,

                    instructor: {
                        select: {
                            name: true,
                            avatar: true,
                        },
                    },

                    tags: {
                        select: {
                            name: true,
                        },
                    },
                },
            });
            return featuredCourses;
        }
        catch (error: any) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Có lỗi xảy ra khi lấy danh sách khoá học phổ biến');
        }

    }

    async findAllCourseForUser(
        page: number,
        limit: number,
        sortBy: string,
        sortOrder: 'asc' | 'desc',
        search?: string,
        filters?: {
            level?: string | string[];
            rating?: number;
            courseType?: string | string[];
            tag?: number | number[];
        }
    ) {
        const allowedFields = ['title', 'createdAt', 'studentCount', 'averageRating', 'price', 'discount'];
        const finalSortBy = allowedFields.includes(sortBy) ? sortBy : 'createdAt';


        const levelValues = normalizeStringArray(filters?.level).map((item) => item.toUpperCase());
        const courseTypeValues = normalizeStringArray(filters?.courseType).map((item) => item.toUpperCase());
        const tagValues = normalizeNumberArray(filters?.tag);
        const parsedRating = filters?.rating ?? null;


        const baseWhere: any = {
            status: true,
            deletedAt: null,
        };
        const whereCondition: any = {
            ...baseWhere,

            ...(levelValues.length > 0 && {
                level: {
                    in: levelValues,
                },
            }),

            ...(courseTypeValues.length > 0 && {
                courseType: {
                    in: courseTypeValues,
                },
            }),

            ...(parsedRating !== null && !Number.isNaN(parsedRating) && {
                averageRating: {
                    gte: parsedRating,
                },
            }),

            ...(tagValues.length > 0 && {
                tags: {
                    some: {
                        id: {
                            in: tagValues,
                        },
                    },
                },
            }),
        };
        if (search && search.trim() !== '') {
            const keyword = search.trim();
            baseWhere.OR = [
                { title: { contains: keyword, mode: 'insensitive' } },
                { slug: { contains: keyword, mode: 'insensitive' } },
            ];
        }
        const skip = (page - 1) * limit;


        //Count
        const levelWhere = {
            ...baseWhere,

            ...(courseTypeValues.length > 0 && {
                courseType: {
                    in: courseTypeValues,
                },
            }),

            ...(parsedRating !== null &&
                !Number.isNaN(parsedRating) && {
                averageRating: {
                    gte: parsedRating,
                },
            }),

            ...(tagValues.length > 0 && {
                tags: {
                    some: {
                        id: {
                            in: tagValues,
                        },
                    },
                },
            }),
        };

        const courseTypeWhere = {
            ...baseWhere,

            ...(levelValues.length > 0 && {
                level: {
                    in: levelValues,
                },
            }),

            ...(parsedRating !== null &&
                !Number.isNaN(parsedRating) && {
                averageRating: {
                    gte: parsedRating,
                },
            }),

            ...(tagValues.length > 0 && {
                tags: {
                    some: {
                        id: {
                            in: tagValues,
                        },
                    },
                },
            }),
        };

        const ratingWhere = {
            ...baseWhere,

            ...(levelValues.length > 0 && {
                level: {
                    in: levelValues,
                },
            }),

            ...(courseTypeValues.length > 0 && {
                courseType: {
                    in: courseTypeValues,
                },
            }),

            ...(tagValues.length > 0 && {
                tags: {
                    some: {
                        id: {
                            in: tagValues,
                        },
                    },
                },
            }),
        };
        // =========================
        // Rating buckets
        // =========================

        const ratingCounts = await Promise.all([
            this.prisma.course.count({
                where: {
                    ...ratingWhere,
                    averageRating: {
                        gte: 4.5,
                    },
                },
            }),

            this.prisma.course.count({
                where: {
                    ...ratingWhere,
                    averageRating: {
                        gte: 4.0,
                    },
                },
            }),

            this.prisma.course.count({
                where: {
                    ...ratingWhere,
                    averageRating: {
                        gte: 3.0,
                    },
                },
            }),

            this.prisma.course.count({
                where: {
                    ...ratingWhere,
                    averageRating: {
                        gte: 2.0,
                    },
                },
            }),
        ]);

        // =========================
        // Courses + total + facets
        // =========================

        const [
            courses,
            totalItems,
            levelCounts,
            courseTypeCounts,
        ] = await Promise.all([
            this.prisma.course.findMany({
                where: whereCondition,
                orderBy: {
                    [finalSortBy]: sortOrder,
                },
                skip,
                take: limit,
                include: {
                    instructor: {
                        select: {
                            name: true,
                            avatar: true,
                        },
                    },
                    tags: {
                        select: {
                            name: true,
                        },
                    },
                },
            }),

            this.prisma.course.count({
                where: whereCondition,
            }),

            this.prisma.course.groupBy({
                by: ['level'],
                where: levelWhere,
                _count: {
                    _all: true,
                },
            }),

            this.prisma.course.groupBy({
                by: ['courseType'],
                where: courseTypeWhere,
                _count: {
                    _all: true,
                },
            }),
        ]);

        const totalPages = Math.ceil(totalItems / limit);

        const filtersCount = {
            level: {
                BEGINNER:
                    levelCounts.find(
                        (item) => item.level === Level.BEGINNER
                    )?._count._all ?? 0,

                INTERMEDIATE:
                    levelCounts.find(
                        (item) => item.level === Level.INTERMEDIATE
                    )?._count._all ?? 0,

                ADVANCED:
                    levelCounts.find(
                        (item) => item.level === Level.ADVANCED
                    )?._count._all ?? 0,
            },

            courseType: {
                FREE:
                    courseTypeCounts.find(
                        (item) => item.courseType === CourseType.FREE
                    )?._count._all ?? 0,

                PAID:
                    courseTypeCounts.find(
                        (item) => item.courseType === CourseType.PAID
                    )?._count._all ?? 0,
            },

            rating: {
                '4.5':
                    ratingCounts[0],

                '4.0':
                    ratingCounts[1],

                '3.0':
                    ratingCounts[2],

                '2.0':
                    ratingCounts[3],
            },
        };

        return {
            courses,
            totalItems,
            totalPages,
            filtersCount,
        };




    }
}
