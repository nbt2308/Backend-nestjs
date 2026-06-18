import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPasswordHelper } from '@/helpers/utils';
import { CreateAuthDto, ResendOtpDto, VerifyOtpDto } from '@/auth/dto/create-auth.dto';
import { nanoid, customAlphabet } from 'nanoid'
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { MailService } from '@/mail/mail.service';
import { OAuthDto } from '@/auth/dto/oauth.dto';
import { JwtService } from '@nestjs/jwt';
dayjs.extend(utc);
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService, private mailService: MailService) { }

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

  async findByEmail(email: string) {
    return await this.prisma.user.findFirst({
      where: {
        email: email
      }
    })
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

  async handleRegister(registerDTO: CreateAuthDto) {
    //check email or phone exist
    const checkUserExist = await this.checkEmailOrPhoneExist(registerDTO.email, registerDTO.phone);
    if (!checkUserExist) {
      throw new ConflictException('Email hoặc số điện thoại đã tồn tại');
    }
    //hash password
    const hashPassword = await hashPasswordHelper(registerDTO.password);
    //create user
    const codeID = customAlphabet(String(process.env.CODE_ID_RULE), 6)();
    const codeExpired = dayjs().utc().add(Number(process.env.CODE_EXPIRED), 'minute').toDate();
    const user = await this.prisma.user.create({
      data: {
        email: registerDTO.email,
        phone: registerDTO.phone,
        password: hashPassword,
        name: registerDTO.name,
        isActive: false,
        codeId: codeID,
        codeExpired: codeExpired
      }
    })
    //send email to verify account
    await this.mailService.sendVerifyEmail(user.email, user.name, codeID);
    return {
      id: user.id
    };
  }

  async handleVerifyOtp(verifyOtpDTO: VerifyOtpDto) {
    try {
      const { id, codeId } = verifyOtpDTO;
      const user = await this.prisma.user.findUnique({
        where: {
          id: id
        }
      })
      if (!user) {
        throw new NotFoundException('Không tìm thấy người dùng')
      }

      if (user.isActive) {
        throw new BadRequestException('Người dùng đã được xác thực')
      }

      if (user.codeId !== codeId) {
        throw new BadRequestException('Mã xác thực không chính xác')
      }

      //check code id expired
      const isCodeExpired = dayjs(user.codeExpired).isBefore(dayjs());
      if (!user.codeExpired || isCodeExpired) {
        throw new BadRequestException('Mã xác thực đã hết hạn')
      }
      const updateUser = await this.prisma.user.update({
        where: {
          id: id
        },
        data: {
          isActive: true
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
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Có lỗi xảy ra khi xác thực');
    }
  }

  async handleResendOtp(resendOtpDTO: ResendOtpDto) {
    try {
      const now = Date.now();
      const requestLimitMs = 2 * 60 * 1000;

      const user = await this.prisma.user.findUnique({
        where: {
          id: resendOtpDTO.id
        }
      })
      if (!user) {
        throw new NotFoundException('Không tìm thấy người dùng')
      }

      if (user.codeExpired && now - user.codeExpired.getTime() < requestLimitMs) {
        const remainMs = user.codeExpired.getTime() - now;
        const remainMinutes = Math.ceil(remainMs / 60000);
        throw new BadRequestException(`Vui lòng chờ ${remainMinutes} phút để gửi lại mã`);
      }
      const codeID = customAlphabet(String(process.env.CODE_ID_RULE), 6)();
      const codeExpired = dayjs().utc().add(Number(process.env.CODE_EXPIRED), 'minute').toDate();
      const updateUser = await this.prisma.user.update({
        where: {
          id: resendOtpDTO.id
        },
        data: {
          codeId: codeID,
          codeExpired: codeExpired
        }
      })
      //send email to verify account
      await this.mailService.sendVerifyEmail(user.email, user.name, codeID);
      return {
        id: updateUser.id
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Có lỗi xảy ra khi gửi lại mã OTP');
    }
  }

}
