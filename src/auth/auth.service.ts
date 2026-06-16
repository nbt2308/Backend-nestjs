
import { BadRequestException, Body, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '@/modules/users/users.service';
import { comparePasswordHelper } from '@/helpers/utils';
import { JwtService } from '@nestjs/jwt';
import { CreateAuthDto } from './dto/create-auth.dto';
import { OAuthDto } from './dto/oauth.dto';
import { PrismaService } from '@/prisma/prisma.service';

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
}
