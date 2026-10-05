import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { CourseStatus, Prisma } from '@prisma/client';
import { generateOrderNumber } from '@/helpers/Payment.util';

@Injectable()
export class OrdersService {

  constructor(private readonly prisma: PrismaService) { }



  async create(userId: string, createOrderDto: CreateOrderDto) {
    const { courseId } = createOrderDto;

    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        deletedAt: null,
        status: CourseStatus.PUBLISHED

      }
    })

    if (!course) {
      throw new BadRequestException("Không tìm thấy khóa học");
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: userId,
          courseId: courseId
        }
      }
    })

    if (enrollment) {
      throw new ConflictException(
        'Bạn đã đăng ký khóa học này',
      );
    }

    if (course.discount === null || new Prisma.Decimal(course.discount).lessThanOrEqualTo(0)) {
      throw new ConflictException(
        'Giá giảm của khóa học không hợp lệ',
      );
    }

    const originalPrice = new Prisma.Decimal(course.price);
    const finalPrice = new Prisma.Decimal(course.discount);
    const discountAmount = originalPrice.minus(finalPrice);

    if (finalPrice.lessThanOrEqualTo(0)) {
      throw new BadRequestException(
        'Khóa học này miễn phí không thể tạo đơn hàng',
      );
    }
    if (finalPrice.greaterThan(originalPrice)) {
      throw new ConflictException(
        'Giá giảm của khóa học không hợp lệ',
      );
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId,
          subtotal: originalPrice,
          discountAmount,
          totalAmount: finalPrice,
          currency: 'VND',
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000), //15p
          orderItems: {
            create: {
              courseId: course.id,
              originalPrice,
              discountAmount,
              finalPrice,
            },
          },
        },
        include: {
          orderItems: {
            include: {
              course: {
                select: {
                  id: true,
                  title: true,
                  thumbnail: true,
                },
              },
            },
          },
        },
      });

      return order;
    });

    return order;


  }

  async findAll() {
    return `This action returns all orders`;
  }

  findOne(id: number) {
    return `This action returns a #${id} order`;
  }

  update(id: number, updateOrderDto: UpdateOrderDto) {
    return `This action updates a #${id} order`;
  }

  remove(id: number) {
    return `This action removes a #${id} order`;
  }
}
