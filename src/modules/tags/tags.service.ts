import { Injectable } from '@nestjs/common';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) { }

  create(createTagDto: CreateTagDto) {
    return 'This action adds a new tag';
  }

  async findAll() {
    try {
      return this.prisma.tag.findMany({
        where: {
          status: true,
        },

      });
    } catch (error) {
      throw error;
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} tag`;
  }

  update(id: number, updateTagDto: UpdateTagDto) {
    return `This action updates a #${id} tag`;
  }

  remove(id: number) {
    return `This action removes a #${id} tag`;
  }
}
