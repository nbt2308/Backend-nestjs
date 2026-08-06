import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateCourseDto } from './dto/create-course.dto';
import { BulkDeleteDto, BulkStatusDto, ChangeStatusDto, UpdateCourseDto } from './dto/update-course.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { generateSlug } from '@/helpers/slug.util';
import { uuidv7 } from 'uuidv7';
import { CourseType } from '@prisma/client';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) { }

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
      const course = await this.prisma.course.create({
        data: {
          id,
          ...createCourseDto,
          slug
        }
      })
      return course;
    } catch (error) {
      // console.log(error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Tạo khoá học thất bại');
    }
  }

  async findAll(page: number, limit: number, sortBy: string, sortOrder: 'asc' | 'desc', search?: string) {
    const allowedFields = ['name', 'email', 'createdAt'];
    const finalSortBy = allowedFields.includes(sortBy) ? sortBy : 'createdAt';

    const whereCondition: any = {};

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
        }
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

  async update(id: string, updateCourseDto: UpdateCourseDto) {
    try {
      console.log('data', updateCourseDto);

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
      const updateCourse = await this.prisma.course.update({
        where: {
          id: id
        },
        data: {
          ...updateCourseDto,
          price: finalPrice,
          discount: finalDiscount,
          slug
        }
      })
      return updateCourse
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
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

  async changeStatus(changeStatusDto: ChangeStatusDto) {
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
      throw new InternalServerErrorException('Có lỗi xảy ra khi thay đổi trạng thái');
    }
  }

  async bulkStatus(bulkStatusDto: BulkStatusDto) {
    try {
      const { ids, status } = bulkStatusDto;
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
      throw new InternalServerErrorException('Có lỗi xảy ra khi cập nhật trạng thái khoá học');
    }
  }

  async bulkDelete(bulkDeleteDto: BulkDeleteDto) {
    try {
      const { ids } = bulkDeleteDto;
      const course = await this.prisma.course.findMany({
        where: {
          id: {
            in: ids
          }
        }
      })
      const result = await this.prisma.course.deleteMany({
        where: {
          id: {
            in: ids
          }
        }
      })
      return {
        count: result.count
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Có lỗi xảy ra khi xóa khoá học');
    }
  }
}
