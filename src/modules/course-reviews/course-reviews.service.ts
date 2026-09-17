import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCourseReviewDto } from './dto/create-course-review.dto';
import { UpdateCourseReviewDto } from './dto/update-course-review.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { EnrollmentStatus } from '@prisma/client';

@Injectable()
export class CourseReviewsService {
  constructor(private readonly prisma: PrismaService) { }
  async getReviews(userId: string | null, slug: string, page = 1, limit = 10, rating?: number, search?: string, sortOrder: 'asc' | 'desc' = 'desc',) {
    try{

    
    const course = await this.prisma.course.findFirst({
      where: {
        slug,
        status: true,
        deletedAt: null,
      },
      select: {
        id: true,
        averageRating: true,
        reviewCount: true,
      },
    });

    if (!course) {
      throw new NotFoundException('Không tìm thấy khóa học');
    }

    page = Math.max(1, page);
    limit = Math.min(Math.max(1, limit), 50);

    const skip = (page - 1) * limit;

    const where = {
      courseId: course.id,
      ...(rating !== undefined && {
        rating,
      }),
      ...(search?.trim() && {
        OR: [
          {
            content: {
              contains: search.trim(),
              mode: 'insensitive' as const,
            },
          },
          {
            user: {
              name: {
                contains: search.trim(),
                mode: 'insensitive' as const,
              },
            },
          },
        ],
      }),
    };

    const [reviews, totalItems, ratingDistribution, userReview] = await Promise.all([
      this.prisma.courseReview.findMany({
        where,
        orderBy: {
          createdAt: sortOrder,
        },
        skip,
        take: limit,
        select: {
          id: true,
          content: true,
          rating: true,
          likes: true,
          dislikes: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      }),
      this.prisma.courseReview.count({
        where: {
          courseId: course.id,
        },
      }),
      this.prisma.courseReview.groupBy({
        by: ['rating'],
        where: {
          courseId: course.id,
        },
        _count: {
          _all: true,
        },
      }),
      userId ? this.prisma.courseReview.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId: course.id,
          },
        },
        select: { id: true },
      }) : Promise.resolve(null),
    ]);

    const reviewIds = reviews.map(review => String(review.id));

    const interactions = await this.prisma.interaction.findMany({
      where: {
        userId: userId || '',
        targetType: 'COURSE_REVIEW',
        targetId: {
          in: reviewIds,
        },
      },
      select: {
        targetId: true,
        actionType: true,
      },
    });

    const interactionMap = new Map(
      interactions.map(item => [item.targetId, item.actionType]),
    );

    return {
      items: reviews.map(review => ({
        ...review,
        myInteraction: interactionMap.get(String(review.id)) ?? null,
      })),
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      page,
      limit,
      rating,
      sortOrder,
      search,
      averageRating: course.averageRating,
      reviewCount: course.reviewCount,
      ratingDistribution: {
        5: ratingDistribution.find(item => item.rating === 5)?._count._all ?? 0,
        4: ratingDistribution.find(item => item.rating === 4)?._count._all ?? 0,
        3: ratingDistribution.find(item => item.rating === 3)?._count._all ?? 0,
        2: ratingDistribution.find(item => item.rating === 2)?._count._all ?? 0,
        1: ratingDistribution.find(item => item.rating === 1)?._count._all ?? 0,
      },
      hasReviewed: !!userReview,
    };
  } catch(error){
    throw error;
  }
  }
  async create(userId: string, slug: string, createCourseReviewDto: CreateCourseReviewDto) {
    try {
      const course = await this.prisma.course.findFirst({
        where: {
          slug,
          status: true,
          deletedAt: null,
        },
        select: {
          id: true
        }
      });

      if (!course) {
        throw new NotFoundException('Không tìm thấy khóa học');
      }

      //check user enrolled course?
      const enroll = await this.prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId: course.id,
          }
        },
        select: {
          status: true
        }
      })

      if (!enroll || ![
        EnrollmentStatus.ENROLLED,
        EnrollmentStatus.IN_PROGRESS,
        EnrollmentStatus.COMPLETED
      ].includes(enroll.status)) {
        throw new BadRequestException('Bạn chưa đăng ký khóa học');
      }

      //check user already reviewed?
      const existingReview = await this.prisma.courseReview.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId: course.id,
          }
        }
      });

      if (existingReview) {
        throw new BadRequestException('Bạn đã đánh giá khóa học');
      }

      const review = await this.prisma.$transaction(async (tx) => {
        // Tạo review trước
        const createReview = await tx.courseReview.create({
          data: {
            userId,
            courseId: course.id,
            ...createCourseReviewDto,
          },
          select: {
            id: true,
            content: true,
            rating: true,
            likes: true,
            dislikes: true,
            createdAt: true,
            updatedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          }
        });

        // Tính lại averageRating và reviewCount SAU KHI review đã được tạo
        const aggregate = await tx.courseReview.aggregate({
          where: {
            courseId: course.id,
          },
          _avg: {
            rating: true,
          },
          _count: {
            _all: true,
          },
        });

        //update course stats
        await tx.course.update({
          where: {
            id: course.id,
          },
          data: {
            averageRating: aggregate._avg.rating ?? 0,
            reviewCount: aggregate._count._all,
          },
        });
        return createReview;
      });

      return review;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw error;
    }

  }

  findAll() {
    return `This action returns all courseReviews`;
  }

  findOne(id: number) {
    return `This action returns a #${id} courseReview`;
  }
  async update(userId: string, slug: string, reviewId: number, updateCourseReviewDto: UpdateCourseReviewDto) {
    try {
      const review = await this.prisma.courseReview.findFirst({
        where: {
          id: reviewId,
          userId,
          course: {
            slug,
            status: true,
            deletedAt: null,
          }
        }
      });

      if (!review) {
        throw new NotFoundException('Không tìm thấy tìm thấy đánh giá');
      }

      const updateReview = await this.prisma.$transaction(async (tx) => {
        const result = await tx.courseReview.update({
          where: {
            id: reviewId,
          },
          data: {
            ...(updateCourseReviewDto.content !== undefined && { content: updateCourseReviewDto.content }),
            ...(updateCourseReviewDto.rating !== undefined && { rating: updateCourseReviewDto.rating }),
          },
          select: {
            id: true,
            content: true,
            rating: true,
            likes: true,
            dislikes: true,
            createdAt: true,
            updatedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        })
        if (updateCourseReviewDto.rating !== undefined) {
          const aggregate = await tx.courseReview.aggregate({
            where: {
              courseId: review.courseId,
            },
            _avg: {
              rating: true,
            },
          });

          await tx.course.update({
            where: {
              id: review.courseId,
            },
            data: {
              averageRating: aggregate._avg.rating ?? 0,
            },
          });
        }
        return result;
      });

      return updateReview;
    }
    catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw error;
    }

  }
  async remove(userId: string, slug: string, reviewId: number) {
    const review = await this.prisma.courseReview.findFirst({
      where: {
        id: reviewId,
        userId,
        course: {
          slug,
          status: true,
          deletedAt: null,
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Không tìm thấy đánh giá');
    }

    await this.prisma.$transaction(async tx => {
      await tx.courseReview.delete({
        where: {
          id: reviewId,
        },
      });

      const aggregate = await tx.courseReview.aggregate({
        where: {
          courseId: review.courseId,
        },
        _avg: {
          rating: true,
        },
        _count: {
          _all: true,
        },
      });

      await tx.course.update({
        where: {
          id: review.courseId,
        },
        data: {
          averageRating: aggregate._avg.rating ?? 0,
          reviewCount: aggregate._count._all,
        },
      });
    });

    return {
      message: 'Xóa đánh giá thành công',
    };
  }
}
