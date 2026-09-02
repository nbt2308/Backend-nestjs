import { Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SectionsService {
  constructor(private prisma: PrismaService) { }

  async create(createSectionDto: CreateSectionDto) {
    try {
      const course = await this.prisma.course.findUnique({
        where: {
          id: createSectionDto.courseId
        }
      })
      if (!course) {
        throw new NotFoundException('Không tìm thấy khoá học');
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
      if (section.course.instructorId !== instructorId) {
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
      if (section.course.instructorId !== instructorId) {
        throw new UnauthorizedException('Bạn không có quyền xoá section này');
      }
      return this.prisma.section.update({
        where: {
          id: id
        },
        data: {
          deletedAt: new Date()
        }
      })
    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException(error.message);
    }
  }
}
