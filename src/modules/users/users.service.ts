import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
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
        throw new BadRequestException('Email hoặc số điện thoại đã tồn tại')
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
      throw new InternalServerErrorException('Tạo người dùng thất bại');
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

  async update(updateUserDto: UpdateUserDto) {
    try {
      const { id, name, phone, address, avatar } = updateUserDto;

      //check user exist
      const user = await this.prisma.user.findUnique({
        where: {
          id: id
        }
      })
      if (!user) {
        throw new NotFoundException('Không tìm thấy người dùng')
      }
      //validate exist phone
      if (phone) {
        const checkPhoneExist = await this.prisma.user.findFirst({
          where: {
            phone: phone,
            NOT: { id: id }
          }
        })
        if (checkPhoneExist) {
          throw new BadRequestException('Số điện thoại đã tồn tại')
        }
      }

      const updateUser = await this.prisma.user.update({
        where: {
          id: id
        },
        data: {
          name: name,
          phone: phone,
          address: address,
          avatar: avatar
        }
      })
      return {
        id: updateUser.id,
        name: updateUser.name,
        email: updateUser.email,
        phone: updateUser.phone,
        address: updateUser.address,
        avatar: updateUser.avatar
      }
    }
    catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Có lỗi xảy ra khi cập nhật');
    }
  }

  async remove(id: number) {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          id: id
        }
      })
      if (!user) {
        throw new NotFoundException('Không tìm thấy người dùng')
      }
      const removeUser = await this.prisma.user.delete({
        where: {
          id: id
        }
      })
      return {
        id: removeUser.id
      }
    }
    catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Có lỗi xảy ra khi xóa');
    }
  }
}
