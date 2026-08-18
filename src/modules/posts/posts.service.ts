import { BadRequestException, Injectable } from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PrismaService } from '../../prisma/prisma.service';
@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) { }
  create(createPostDto: CreatePostDto) {
    return 'This action adds a new post';
  }

  findAll() {
    return `This action returns all posts`;
  }

  findOne(id: number) {
    return `This action returns a #${id} post`;
  }

  update(id: number, updatePostDto: UpdatePostDto) {
    return `This action updates a #${id} post`;
  }

  remove(id: number) {
    return `This action removes a #${id} post`;
  }

  // async getLatestPosts(limit: number) {
  //   try {
  //     if (!limit || limit <= 0) {
  //       throw new BadRequestException('Số lượng bài viết phải lớn hơn 0');
  //     }
  //     const latestPosts = await this.prisma.post.findMany({
  //       where: {
  //         status: true,
  //       },
  //       orderBy: {
  //         createdAt: 'desc',
  //       },
  //       take: limit,
  //       include: {
  //         author: true,
  //         category: true,
  //       },
  //     });
  //     return latestPosts;
  //   }
  //   catch (error: any) {
  //     if (error instanceof BadRequestException) {
  //       throw error;
  //     }
  //     throw new InternalServerErrorException('Có lỗi xảy ra khi lấy danh sách bài viết mới nhất');
  //   }
  // }
}
