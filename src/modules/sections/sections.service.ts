import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { CleanupService } from '@/cleanup/cleanup.service';
import { CourseStatus } from '@prisma/client';
import { AuthorizationService } from '@/authorization/authorization.service';

@Injectable()
export class SectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cleanupService: CleanupService,
    private readonly authorizationService: AuthorizationService,
  ) { }

  async create(createSectionDto: CreateSectionDto, userId: string) {
    try {
      const course = await this.prisma.course.findUnique({
        where: {
          id: createSectionDto.courseId
        },
        select: {
          instructorId: true,
          status: true
        }
      })
      if (!course) {
        throw new NotFoundException('Không tìm thấy khoá học');
      }
      const isAdmin = await this.authorizationService.hasRole(userId, 'ADMIN');

      if (!isAdmin && course.instructorId !== userId) {
        throw new ForbiddenException(
          'Bạn không có quyền thêm bài giảng vào khóa học này',
        );
      }
      if (!([CourseStatus.DRAFT, CourseStatus.REJECTED, CourseStatus.UNPUBLISHED] as CourseStatus[]).includes(course.status)) {
        throw new BadRequestException('Không thể chỉnh sửa nội dung khi khóa học đang xuất bản hoặc chờ duyệt');
      }
      const section = await this.prisma.section.create({
        data: createSectionDto
      })
      return section;
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(error.message);
    }
  }

  async findAll(courseId: string) {
    try {
      return this.prisma.section.findMany(
        {
          where: {
            courseId: courseId,
            deletedAt: null
          },
          include: {
            lessons: {
              where: {
                deletedAt: null
              },
              orderBy: {
                order: 'asc'
              },
              include: {
                resources: {
                  select: {
                    id: true,
                    name: true,
                    mimeType: true,
                    size: true,
                  }
                }
              }
            }
          },
          orderBy: {
            order: 'asc'
          }
        }
      );
    } catch (error) {
      throw error;
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} section`;
  }

  async update(id: number, instructorId: string, updateSectionDto: UpdateSectionDto) {
    try {
      const course = await this.prisma.course.findUnique({
        where: {
          id: updateSectionDto.courseId
        }
      })
      if (!course) {
        throw new NotFoundException('Không tìm thấy khoá học');
      }
      
      if (!([CourseStatus.DRAFT, CourseStatus.REJECTED, CourseStatus.UNPUBLISHED] as CourseStatus[]).includes(course.status)) {
        throw new BadRequestException('Không thể chỉnh sửa nội dung khi khóa học đang xuất bản hoặc chờ duyệt');
      }
      const section = await this.prisma.section.findUnique({
        where: {
          id: id,
          courseId: updateSectionDto.courseId
        },
        include: {
          course: true
        }
      })
      if (!section) {
        throw new NotFoundException('Không tìm thấy section');
      }
      const isAdmin = await this.authorizationService.hasRole(instructorId, 'ADMIN');
      if (!isAdmin && section.course.instructorId !== instructorId) {
        throw new UnauthorizedException('Bạn không có quyền sửa section này');
      }
      return this.prisma.section.update({
        where: {
          id: id
        },
        data: updateSectionDto
      })
    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException(error.message);
    }
  }

  async remove(id: number, instructorId: string) {
    try {
      const section = await this.prisma.section.findUnique({
        where: {
          id: id
        },
        include: {
          course: true
        }
      })
      if (!section) {
        throw new NotFoundException('Không tìm thấy section');
      }
      const isAdmin = await this.authorizationService.hasRole(
        instructorId,
        'ADMIN',
      );
      if (!isAdmin && section.course.instructorId !== instructorId) {
        throw new UnauthorizedException('Bạn không có quyền xoá section này');
      }
      if (!([CourseStatus.DRAFT, CourseStatus.REJECTED, CourseStatus.UNPUBLISHED] as CourseStatus[]).includes(section.course.status)) {
        throw new BadRequestException('Không thể chỉnh sửa nội dung khi khóa học đang xuất bản hoặc chờ duyệt');
      }
      const deletedSection = await this.prisma.section.update({
        where: {
          id: id
        },
        data: {
          deletedAt: new Date()
        }
      });
      this.cleanupService.addSectionCleanupJob(id);
      return deletedSection;
    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException(error.message);
    }
  }
}
