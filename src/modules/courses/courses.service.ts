import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateCourseDto } from './dto/create-course.dto';
import { BulkDeleteDto, UpdateCourseDto, SubmitCourseDto, ApproveCourseDto, BulkApproveCourseDto, RejectCourseDto, UnpublishCourseDto } from './dto/update-course.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { generateSlug } from '@/helpers/slug.util';
import { uuidv7 } from 'uuidv7';
import { CourseType, Level, CourseStatus, Prisma } from '@prisma/client';
import { normalizeNumberArray, normalizeStringArray } from '@/helpers/normalizeArray.utils';
import { AuthorizationService } from '@/authorization/authorization.service';
import { CleanupService } from '@/cleanup/cleanup.service';
import { extractPublicIdsFromHtml } from '@/media/media.utils';

@Injectable()
export class CoursesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly authorizationService: AuthorizationService,
        private readonly cleanupService: CleanupService,
    ) { }

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

            //check exist category
            const existCategory = await this.prisma.category.findFirst({
                where: {
                    id: createCourseDto.categoryId,
                    status: true,
                },
                select: {
                    id: true,
                    parentId: true,
                    _count: {
                        select: {
                            children: true,
                        },
                    },
                },
            });
            if (!existCategory) {
                throw new BadRequestException('Danh mục không tồn tại hoặc đã bị vô hiệu hóa');
            }
            if (existCategory._count.children > 0) {
                throw new BadRequestException(
                    'Không thể chọn danh mục gốc có danh mục con',
                );
            }
            const id = uuidv7();
            const { tags, introduction, learningOutcomes, requirements, resources, ...restDto } = createCourseDto;

            const course = await this.prisma.$transaction(async (tx) => {
                return tx.course.create({
                    data: {
                        ...restDto,
                        slug,
                        tags: {
                            connect: tags.map((tagId) => ({ id: tagId })),
                        },
                        courseDescription: {
                            create: {
                                introduction,
                                learningOutcomes,
                                requirements: requirements || "",
                                resources: resources || "",
                            },
                        },
                    },
                    include: {
                        tags: true,
                        courseDescription: true,
                    },
                });
            });
            return course;
        } catch (error) {
            console.log(error);
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw error;
        }
    }

    async findAllPaginate(page: number, limit: number, sortBy: string, sortOrder: 'asc' | 'desc', search?: string) {
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
                    slug: {
                        contains: search.trim(),
                        mode: 'insensitive',
                    },
                },
                {
                    courseDescription: {
                        introduction: {
                            contains: search.trim(),
                            mode: 'insensitive',
                        },
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

    async findAll() {
        return await this.prisma.course.findMany({
            where: {
                deletedAt: null
            },
            include: {
                instructor: {
                    select: {
                        name: true,
                        email: true,
                        avatar: true,
                        id: true,
                        createdAt:true
                    }
                },
                tags: true,
                courseDescription: true,
                category: {
                    select: {
                        children: true,
                        parentId:true,
                        name:true,
                        id:true
                    }
                }
            },
        })
    }

    async getPreviewLesson(slug: string, lessonId: number) {
        const lesson = await this.prisma.lesson.findFirst({
            where: {
                id: lessonId,
                deletedAt: null,
                isPreview: true,
                section: {
                    deletedAt: null,
                    course: {
                        slug,
                        status: CourseStatus.PUBLISHED,
                        deletedAt: null,
                    },
                },
            },
            select: {
                id: true,
                title: true,
                videoId: true,
                duration: true,
                content: true,
            },
        });

        if (!lesson) {
            throw new NotFoundException('Không tìm thấy bài học xem trước');
        }

        return lesson;
    }
    async findOneBySlug(slug: string, userId: string) {
        const course = await this.prisma.course.findFirst({
            where: {
                slug,
                status: { in: [CourseStatus.PUBLISHED, CourseStatus.UNPUBLISHED] },
                deletedAt: null,
            },
            select: {
                id: true,
                status: true,
                title: true,
                slug: true,
                thumbnail: true,
                courseType: true,
                level: true,
                price: true,
                discount: true,
                averageRating: true,
                reviewCount: true,
                studentCount: true,
                updatedAt: true,
                instructor: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true,
                    },
                },
                tags: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                courseDescription: {
                    select: {
                        introduction: true,
                        learningOutcomes: true,
                        requirements: true,
                        resources: true,
                    },
                },
                sections: {
                    where: {
                        deletedAt: null,
                    },
                    orderBy: {
                        order: 'asc',
                    },
                    select: {
                        id: true,
                        title: true,
                        order: true,
                        lessons: {
                            where: {
                                deletedAt: null,
                            },
                            orderBy: {
                                order: 'asc',
                            },
                            select: {
                                id: true,
                                title: true,
                                duration: true,
                                order: true,
                                isPreview: true,
                            },
                        },
                    },
                },
            },
        });

        if (!course) {
            throw new NotFoundException('Không tìm thấy khóa học');
        }

        //instructor stats
        const instructorCourses = await this.prisma.course.findMany({
            where: {
                instructorId: course.instructor.id,
                deletedAt: null,
                status: CourseStatus.PUBLISHED
            },
            select: {
                id: true,
                averageRating: true,
                reviewCount: true,
            },
        })
        const instructorCourseIds = instructorCourses.map(item => item.id);

        const instructorUniqueStudents = await this.prisma.enrollment.findMany({
            where: {
                courseId: {
                    in: instructorCourseIds,
                },
            },
            select: {
                userId: true,
            },
            distinct: ['userId'],
        });
        const instructorStats = instructorCourses.reduce(
            (acc, item) => {
                acc.reviewCount += item.reviewCount;
                acc.weightedRating += item.averageRating * item.reviewCount;
                return acc;
            },
            {
                reviewCount: 0,
                weightedRating: 0,
            },
        );

        const instructorRating =
            instructorStats.reviewCount > 0
                ? instructorStats.weightedRating / instructorStats.reviewCount
                : 0;

        const sections = course.sections.map((section) => ({
            id: section.id,
            title: section.title,
            order: section.order,
            lessonCount: section.lessons.length,
            totalDuration: section.lessons.reduce(
                (total, lesson) => lesson.duration ? total + lesson.duration : total,
                0,
            ),
            lessons: section.lessons,
        }));

        const totalLessons = sections.reduce((total, section) => total + section.lessonCount, 0);
        const totalDuration = sections.reduce((total, section) => total + section.totalDuration, 0);

        let isEnrolled = false;

        if (userId) {
            const enrollment = await this.prisma.enrollment.findUnique({
                where: {
                    userId_courseId: {
                        userId,
                        courseId: course.id,
                    },
                },
                select: {
                    status: true,
                },
            });

            isEnrolled = !!enrollment;
        }

        // Nếu course UNPUBLISHED thì chỉ user đã mua mới xem được
        if (course.status === CourseStatus.UNPUBLISHED && !isEnrolled) {
            throw new NotFoundException('Không tìm thấy khóa học');
        }

        return {
            ...course,
            instructor: {
                ...course.instructor,
                studentCount: instructorUniqueStudents.length,
                courseCount: instructorCourses.length,
                instructorRating: Number(instructorRating.toFixed(2)),
            },
            sections,
            totalLessons,
            totalDuration,
            isEnrolled,
        };
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
            const { introduction, learningOutcomes, requirements, resources, tags: tagIds, ...restUpdateDto } = updateCourseDto;

            //check description
            const hasDescriptionFields = (introduction !== undefined || learningOutcomes !== undefined || requirements !== undefined || resources !== undefined)
            //Ownership check 
            const isAdmin =
                await this.authorizationService.hasRole(userId, 'ADMIN');

            if (!isAdmin && course.instructorId !== userId) {
                throw new ForbiddenException('Bạn không có quyền cập nhật khóa học này');
            }
            if (!isAdmin && !([CourseStatus.DRAFT, CourseStatus.REJECTED, CourseStatus.UNPUBLISHED] as CourseStatus[]).includes(course.status)) {
                throw new BadRequestException('Khóa học phải ở trạng thái DRAFT, REJECTED hoặc UNPUBLISHED mới có thể cập nhật');
            }

            // Validate status transition theo bảng rule
            if (updateCourseDto.status && updateCourseDto.status !== course.status) {
                const ALLOWED_TRANSITIONS: Record<CourseStatus, CourseStatus[]> = {
                    [CourseStatus.DRAFT]: [CourseStatus.PENDING],
                    [CourseStatus.PENDING]: [CourseStatus.DRAFT, CourseStatus.PUBLISHED, CourseStatus.REJECTED],
                    [CourseStatus.REJECTED]: [CourseStatus.DRAFT],
                    [CourseStatus.PUBLISHED]: [CourseStatus.UNPUBLISHED],
                    [CourseStatus.UNPUBLISHED]: [CourseStatus.PUBLISHED],
                };

                const allowed = ALLOWED_TRANSITIONS[course.status] || [];
                if (!allowed.includes(updateCourseDto.status)) {
                    throw new BadRequestException(
                        `Không thể chuyển trạng thái từ "${course.status}" sang "${updateCourseDto.status}". Vui lòng sử dụng đúng quy trình duyệt khóa học.`
                    );
                }

                if (updateCourseDto.status === CourseStatus.REJECTED) {
                    if (!updateCourseDto.reason_rejected || updateCourseDto.reason_rejected.trim() === '') {
                        throw new BadRequestException('Lý do từ chối không được để trống');
                    }
                }
            }

            //check exist category
            if (updateCourseDto.categoryId !== undefined) {
                const existCategory = await this.prisma.category.findFirst({
                    where: {
                        id: updateCourseDto.categoryId,
                        status: true,
                    },
                    select: {
                    id: true,
                    parentId: true,
                    _count: {
                        select: {
                            children: true,
                        },
                    },
                },
                });
                if (!existCategory) {
                    throw new BadRequestException('Danh mục không tồn tại hoặc đã bị vô hiệu hóa');
                }
                //check child
                if (existCategory._count.children > 0) {
                    throw new BadRequestException('Danh mục đã có danh mục con, không thể gán khóa học vào danh mục này');
                }
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
                    ...(hasDescriptionFields && {
                        courseDescription: {
                            upsert: {
                                create: {
                                    introduction: introduction ?? '',
                                    learningOutcomes: learningOutcomes ?? '',
                                    requirements,
                                    resources,
                                },
                                update: {
                                    ...(introduction !== undefined && { introduction }),
                                    ...(learningOutcomes !== undefined && { learningOutcomes }),
                                    ...(requirements !== undefined && { requirements }),
                                    ...(resources !== undefined && { resources }),
                                },
                            },
                        }
                    })
                },
                include: { tags: true, courseDescription: true },
            })

            // Thumbnail cũ bị thay -> xóa ảnh Cloudinary không còn được tham chiếu
            if (
                course.thumbnail_publicID &&
                course.thumbnail_publicID !== updateCourseDto.thumbnail_publicID
            ) {
                await this.cleanupService.addCloudinaryCleanupJob([course.thumbnail_publicID]);
            }

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

            // Hard delete xóa luôn row section/lesson nên phải gom public_id TRƯỚC khi
            // delete; worker xử lý các loại media khác sẽ không còn gì để query.
            const lessons = await this.prisma.lesson.findMany({
                where: { section: { courseId: id } },
                select: { content: true },
            });
            const publicIds = new Set<string>();
            if (course.thumbnail_publicID) {
                publicIds.add(course.thumbnail_publicID);
            }
            for (const lesson of lessons) {
                for (const publicId of extractPublicIdsFromHtml(lesson.content)) {
                    publicIds.add(publicId);
                }
            }
            await this.cleanupService.addCloudinaryCleanupJob([...publicIds]);

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
    async softDelete(userId: string, id: string, deletedReason?: string) {
        try {
            console.log(deletedReason)
            const course = await this.prisma.course.findUnique({
                where: { id }
            })
            if (!course || course.deletedAt) {
                throw new NotFoundException('Không tìm thấy khóa học')
            }

            const isAdmin = await this.authorizationService.hasRole(userId, 'ADMIN');

            if (!isAdmin && course.instructorId !== userId) {
                throw new ForbiddenException('Bạn không có quyền xóa khóa học này');
            }

            if (!isAdmin) {
                if (!([CourseStatus.DRAFT, CourseStatus.REJECTED] as CourseStatus[]).includes(course.status)) {
                    throw new BadRequestException('Giảng viên chỉ có thể xóa khóa học ở trạng thái DRAFT hoặc REJECTED');
                }
            } else {
                if (!deletedReason) {
                    throw new BadRequestException('Lý do xóa không được để trống khi admin xóa');
                }
            }

            const softDeleteCourse = await this.prisma.course.update({
                where: { id },
                data: {
                    deletedAt: new Date(),
                    ...(isAdmin ? { deletedById: userId, deletedReason } : {})
                }
            });

            this.cleanupService.addCourseCleanupJob(id);

            // Thumbnail thuộc về course: addCourseCleanupJob đã lo section/lesson con,
            // thumbnail phải xóa riêng (không nằm trong handleCleanupSection).
            if (course.thumbnail_publicID) {
                this.cleanupService.addCloudinaryCleanupJob([course.thumbnail_publicID]);
            }

            return {
                id: softDeleteCourse.id,
                title: softDeleteCourse.title
            }
        }
        catch (error) {
            if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Có lỗi xảy ra khi xóa');
        }
    }

    async submitCourse(userId: string, submitDto: SubmitCourseDto) {
        const { id } = submitDto;
        const course = await this.prisma.course.findUnique({ where: { id } });

        if (!course || course.deletedAt) throw new NotFoundException('Không tìm thấy khóa học');
        if (course.instructorId !== userId) throw new ForbiddenException('Bạn không có quyền thao tác khóa học này');
        if (!([CourseStatus.DRAFT, CourseStatus.REJECTED, CourseStatus.UNPUBLISHED] as CourseStatus[]).includes(course.status)) {
            throw new BadRequestException('Khóa học phải ở trạng thái DRAFT, REJECTED hoặc UNPUBLISHED mới có thể submit');
        }
        const category = await this.prisma.category.findFirst({
            where: {
                id: course.categoryId,
                status: true,
            },
        });

        if (!category) {
            throw new BadRequestException(
                'Danh mục của khóa học không còn hoạt động',
            );
        }
        return this.prisma.course.update({
            where: { id },
            data: { status: CourseStatus.PENDING, reason_rejected: null }
        });
    }

    async approveCourse(userId: string, approveDto: ApproveCourseDto) {
        const { id } = approveDto;
        const course = await this.prisma.course.findUnique({ where: { id } });
        if (!course || course.deletedAt)
            throw new NotFoundException('Không tìm thấy khóa học');
        if (course.status !== CourseStatus.PENDING)
            throw new BadRequestException('Khóa học không ở trạng thái PENDING');
        const category = await this.prisma.category.findFirst({
            where: {
                id: course.categoryId,
                status: true,
            },
        });

        if (!category) {
            throw new BadRequestException(
                'Danh mục của khóa học không còn hoạt động',
            );
        }
        return this.prisma.course.update({
            where: { id },
            data: {
                status: CourseStatus.PUBLISHED,
                approvedById: userId,
                approvedAt: new Date()
            }
        });
    }

    async bulkApproveCourse(userId: string, bulkApproveDto: BulkApproveCourseDto) {
        const { ids } = bulkApproveDto;
        const courses = await this.prisma.course.findMany({
            where: {
                id: { in: ids },
                deletedAt: null
            }
        });
        if (courses.length !== ids.length)
            throw new NotFoundException('Một số khóa học không tồn tại hoặc đã bị xóa');
        for (const c of courses) {
            if (c.status !== CourseStatus.PENDING)
                throw new BadRequestException(`Khóa học ${c.title} không ở trạng thái PENDING`);
        }
        await this.prisma.course.updateMany({
            where: { id: { in: ids } },
            data: {
                status: CourseStatus.PUBLISHED,
                approvedById: userId,
                approvedAt: new Date()
            }
        });
        return { count: ids.length };
    }

    async rejectCourse(userId: string, rejectDto: RejectCourseDto) {
        const { id, reason_rejected } = rejectDto;
        const course = await this.prisma.course.findUnique({ where: { id } });
        if (!course || course.deletedAt) throw new NotFoundException('Không tìm thấy khóa học');
        if (course.status !== CourseStatus.PENDING) throw new BadRequestException('Khóa học không ở trạng thái PENDING');
        return this.prisma.course.update({
            where: { id },
            data: { status: CourseStatus.REJECTED, reason_rejected }
        });
    }

    async cancelReview(userId: string, cancelDto: SubmitCourseDto) {
        const { id } = cancelDto;
        const course = await this.prisma.course.findUnique({ where: { id } });
        if (!course || course.deletedAt) throw new NotFoundException('Không tìm thấy khóa học');
        if (course.instructorId !== userId) throw new ForbiddenException('Bạn không có quyền thao tác khóa học này');
        if (course.status !== CourseStatus.PENDING) throw new BadRequestException('Chỉ có thể hủy gửi duyệt khi khóa học đang ở trạng thái Chờ duyệt');
        return this.prisma.course.update({
            where: { id },
            data: { status: CourseStatus.DRAFT }
        });
    }

    async unpublishCourse(userId: string, unpublishDto: UnpublishCourseDto) {
        const { id } = unpublishDto;
        const course = await this.prisma.course.findUnique({ where: { id } });
        if (!course || course.deletedAt) throw new NotFoundException('Không tìm thấy khóa học');
        if (course.instructorId !== userId) throw new ForbiddenException('Bạn không có quyền thao tác khóa học này');
        if (course.status !== CourseStatus.PUBLISHED) throw new BadRequestException('Khóa học phải ở trạng thái PUBLISHED mới có thể unpublish');
        return this.prisma.course.update({
            where: { id },
            data: { status: CourseStatus.UNPUBLISHED }
        });
    }

    async bulkDelete(userId: string, bulkDeleteDto: BulkDeleteDto) {
        try {
            const { ids } = bulkDeleteDto;
            const courses = await this.prisma.course.findMany({
                where: { id: { in: ids } }
            })
            if (courses.length === 0) {
                throw new BadRequestException('Không tìm thấy khóa học nào để xóa');
            }

            for (const course of courses) {
                if (course.instructorId !== userId) {
                    throw new ForbiddenException('Bạn không có quyền xóa khóa học trong danh sách này');
                }
                if (!([CourseStatus.DRAFT, CourseStatus.REJECTED] as CourseStatus[]).includes(course.status)) {
                    throw new BadRequestException(`Khóa học ${course.title} không ở trạng thái DRAFT hoặc REJECTED`);
                }
            }

            const result = await this.prisma.course.updateMany({
                where: { id: { in: ids } },
                data: { deletedAt: new Date() }
            });

            for (const id of ids) {
                this.cleanupService.addCourseCleanupJob(id);
            }

            return { count: result.count }
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof ForbiddenException) {
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
                    status: CourseStatus.PUBLISHED,
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
            category?: number | number[];
        }
    ) {
        const allowedFields = ['title', 'createdAt', 'studentCount', 'averageRating', 'price', 'discount'];
        const finalSortBy = allowedFields.includes(sortBy) ? sortBy : 'createdAt';


        const levelValues = normalizeStringArray(filters?.level).map((item) => item.toUpperCase());
        const courseTypeValues = normalizeStringArray(filters?.courseType).map((item) => item.toUpperCase());
        const tagValues = normalizeNumberArray(filters?.tag);
        const categoryValues = normalizeNumberArray(filters?.category);
        const parsedRating = filters?.rating ?? null;


        const baseWhere: any = {
            status: CourseStatus.PUBLISHED,
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
            ...(categoryValues.length > 0 && {
                category: {
                    some: {
                        OR: [
                            {
                                id: {
                                    in: categoryValues,
                                },
                            },
                            {
                                parentId: {
                                    in: categoryValues,
                                },
                            },
                        ],
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
            ...(categoryValues.length > 0 && {
                category: {
                    some: {
                        OR: [
                            {
                                id: {
                                    in: categoryValues,
                                },
                            },
                            {
                                parentId: {
                                    in: categoryValues,
                                },
                            },
                        ],
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
            ...(categoryValues.length > 0 && {
                category: {
                    some: {
                        OR: [
                            {
                                id: {
                                    in: categoryValues,
                                },
                            },
                            {
                                parentId: {
                                    in: categoryValues,
                                },
                            },
                        ],
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
            ...(categoryValues.length > 0 && {
                category: {
                    some: {
                        OR: [
                            {
                                id: {
                                    in: categoryValues,
                                },
                            },
                            {
                                parentId: {
                                    in: categoryValues,
                                },
                            },
                        ],
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
                    category: {
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

    async findRelatedCoursesBySlug(slug: string) {

        const course = await this.prisma.course.findFirst({
            where: {
                slug,
                status: CourseStatus.PUBLISHED,
                deletedAt: null,
            },
            select: {
                id: true,
                categoryId: true,
                courseType: true,
                tags: {
                    select: {
                        id: true,
                    },
                },
            },
        });

        if (!course) {
            throw new NotFoundException('Không tìm thấy khóa học');
        }

        const relatedCourses = await this.prisma.course.findMany({
            where: {
                id: {
                    not: course.id,
                },
                status: CourseStatus.PUBLISHED,
                deletedAt: null,
                categoryId: course.categoryId,
                courseType: course.courseType,
                ...(course.tags.length > 0 && {
                    tags: {
                        some: {
                            id: {
                                in: course.tags.map((tag) => tag.id),
                            },
                        },
                    },
                }),
            },
            include: {
                instructor: {
                    select: {
                        name: true,
                        avatar: true,
                    },
                },
                category: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
                tags: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: [
                {
                    averageRating: 'desc',
                },
                {
                    studentCount: 'desc',
                },
            ],
            take: 4,
        });
        return relatedCourses;
    }
}
