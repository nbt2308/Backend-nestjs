import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EnrollmentStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { AuthorizationService } from '@/authorization/authorization.service';

@Injectable()
export class LessonAccessService {
  constructor(private readonly prisma: PrismaService, private readonly authorizationService: AuthorizationService) { }

  async getLessonForAccess(lessonId: number) {
    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id: lessonId,
        deletedAt: null,
        section: {
          deletedAt: null,
          course: {
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
        order: true,
        isPreview: true,
        section: {
          select: {
            id: true,
            courseId: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Không tìm thấy bài giảng');
    }

    return lesson;
  }

  async canAccessLesson(
    userId: string,
    lessonId: number,
  ): Promise<boolean> {
    const lesson = await this.getLessonForAccess(lessonId);

    if (lesson.isPreview) {
      return true;
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: lesson.section.courseId,
        },
      },
      select: {
        status: true,
      },
    });

    if (!enrollment) {
      return false;
    }

    return [
      EnrollmentStatus.ENROLLED,
      EnrollmentStatus.IN_PROGRESS,
      EnrollmentStatus.COMPLETED,
    ].includes(enrollment.status);
  }

  //Khẳng định quyền truy cập bài học
  async assertCanAccessLesson(
    userId: string,
    lessonId: number,
  ) {
    const lesson = await this.getLessonForAccess(lessonId);

    if (lesson.isPreview) {
      return lesson;
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: lesson.section.courseId,
        },
      },
      select: {
        status: true,
      },
    });

    const canAccess =
      enrollment &&
      [
        EnrollmentStatus.ENROLLED,
        EnrollmentStatus.IN_PROGRESS,
        EnrollmentStatus.COMPLETED,
      ].includes(enrollment.status);

    if (!canAccess) {
      throw new ForbiddenException(
        'Bạn phải đăng ký khóa học này để truy cập bài học',
      );
    }

    return lesson;
  }

  //Khẳng định quyền tải tài nguyên của bài học
  async assertCanDownloadResource(
    userId: string,
    lessonId: number,
  ) {
    const lesson = await this.getLessonForAccess(lessonId);
    const isAdmin = await this.authorizationService.hasRole(userId, 'ADMIN');
    if (isAdmin) {
      return lesson;
    }
    if (lesson.isPreview) {
      throw new ForbiddenException(
        'Không thể tải tài nguyên của bài giảng cho phép xem trước',
      );
    }


    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: lesson.section.courseId,
        },
      },
      select: {
        status: true,
      },
    });

    const canDownload =
      enrollment &&
      [
        EnrollmentStatus.ENROLLED,
        EnrollmentStatus.IN_PROGRESS,
        EnrollmentStatus.COMPLETED,
      ].includes(enrollment.status);

    if (!canDownload) {
      throw new ForbiddenException(
        'Bạn phải đăng ký khóa học để tải tài nguyên',
      );
    }

    return lesson;
  }
}