import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
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

  update(id: number, updateCourseDto: UpdateCourseDto) {
    return `This action updates a #${id} course`;
  }

  remove(id: number) {
    return `This action removes a #${id} course`;
  }
}
