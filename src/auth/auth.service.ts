
import { BadRequestException, Body, ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '@/modules/users/users.service';
import { comparePasswordHelper } from '@/helpers/utils';
import { JwtService } from '@nestjs/jwt';
import { CreateAuthDto, ResendOtpDto, VerifyOtpDto } from './dto/create-auth.dto';
import { OAuthDto } from './dto/oauth.dto';
import { PrismaService } from '@/prisma/prisma.service';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService, private jwtService: JwtService, private prisma: PrismaService) { }

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(username);
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }
    if (!user.password) {
      throw new ConflictException(
        'Email này đã được đăng ký bằng Google hoặc GitHub. Vui lòng chọn đúng phương thức đăng nhập'
      );
    }
    const isValidPassword = await comparePasswordHelper(password, user?.password ?? '')
    if (!isValidPassword) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }
    else {
      if (user.isActive === false) {
        //check verify token expired
        const isVerifyTokenExpired = dayjs(user.verifyTokenExpired).isBefore(dayjs());
        if (!user.verifyTokenExpired || isVerifyTokenExpired) {
          const verifyToken = uuidv4()
          const verifyTokenExpired = dayjs().utc().add(Number(process.env.VERIFY_TOKEN_EXPIRED), 'minute').toDate();
          const update = await this.prisma.user.update({
            where: {
              id: user.id
            },
            data: {
              verifyToken: verifyToken,
              verifyTokenExpired: verifyTokenExpired
            }
          })

          throw new ForbiddenException({
            statusCode: 403,
            error: "Forbidden",
            message: 'Tài khoản chưa được kích hoạt',
            verifyToken: update.verifyToken
          });
        }
        throw new ForbiddenException({
          statusCode: 403,
          error: "Forbidden",
          message: 'Tài khoản chưa được kích hoạt',
          verifyToken: user.verifyToken
        });
      }
    }

    return user;
  }

  async login(user: any) {
    const payload = { username: user.email, sub: user.id };
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      access_token: this.jwtService.sign(payload),
    };
  }
  async register(registerDTO: CreateAuthDto) {
    return await this.usersService.handleRegister(registerDTO);
  }

  async oauthLogin(oauthDTO: OAuthDto) {
    let user = await this.prisma.user.findUnique({
      where: {
        email: oauthDTO.email
      }
    })
    if (user) {
      const updateData: any = {
        name: oauthDTO.name,
        avatar: oauthDTO.avatar,
        isActive: true
      }

      if (oauthDTO.provider === 'google') {
        updateData.googleId = oauthDTO.providerId;
      }
      else if (oauthDTO.provider === 'github') {
        updateData.githubId = oauthDTO.providerId;
      }

      user = await this.prisma.user.update({
        where: {
          email: oauthDTO.email
        },
        data: updateData
      })

    } else {
      const createData: any = {
        email: oauthDTO.email,
        name: oauthDTO.name,
        avatar: oauthDTO.avatar
      }

      if (oauthDTO.provider === 'google') {
        createData.googleId = oauthDTO.providerId;
      }
      else if (oauthDTO.provider === 'github') {
        createData.githubId = oauthDTO.providerId;
      }

      user = await this.prisma.user.create({
        data: createData
      })
    }

    //generate token
    const payload = {
      username: user.email,
      sub: user.id
    }
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      access_token: this.jwtService.sign(payload)
    }

  }

  async verifyOtp(verifyOtpDTO: VerifyOtpDto) {
    return await this.usersService.handleVerifyOtp(verifyOtpDTO);
  }
  async resendOtp(resendOtpDTO: ResendOtpDto) {
    return await this.usersService.handleResendOtp(resendOtpDTO);
  }
}
