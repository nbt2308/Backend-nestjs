import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPasswordHelper } from '@/helpers/utils';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  //func check email and phone exist
  checkEmailOrPhoneExist = async (email: string, phone: string) => {
    const user = await this.prisma.user.count({
      where: {
        OR: [
          { email },
          { phone }
        ]
      }
    })
    if (user > 0) {
      return false;
    }
    return true;
  }
  async createUser(createUserDto: CreateUserDto) {
    try {
      const { name, email, phone, password } = createUserDto;
      const checkEmailOrPhoneExist = await this.checkEmailOrPhoneExist(email, phone)
      if (!checkEmailOrPhoneExist) {
        throw new BadRequestException('Email or phone already exists')
      }
      const hashPassword = await hashPasswordHelper(password);
      const user = await this.prisma.user.create({
        data: {
          name,
          email,
          phone,
          password: hashPassword,
        },
      })
      return {
        id: user.id
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create user');
    }

  }

  async findAll(page: number, limit: number, sortBy: string, sortOrder: 'asc' | 'desc') {
    const allowedFields = ['name', 'email', 'createdAt'];
    const finalSortBy = allowedFields.includes(sortBy) ? sortBy : 'createdAt';

    const skip = (page - 1) * limit;
    const take = limit;
    const [users, totalItems] = await Promise.all([
      this.prisma.user.findMany({
        skip: skip,
        take: take,
        orderBy: {
          [finalSortBy]: sortOrder
        }
      }),
      this.prisma.user.count()
    ])
    const totalPages = Math.ceil(totalItems / take);
    return { users, totalItems, totalPages };
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
