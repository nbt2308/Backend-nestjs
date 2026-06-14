
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '@/modules/users/users.service';
import { comparePasswordHelper } from '@/helpers/utils';
import { JwtService } from '@nestjs/jwt';
import { CreateAuthDto } from './dto/create-auth.dto';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService, private jwtService: JwtService) { }

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(username);
    const isValidPassword = await comparePasswordHelper(password, user?.password ?? '')
    if (!user || !isValidPassword) return null;

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
  register = async (registerDTO: CreateAuthDto) => {
    return await this.usersService.handleRegister(registerDTO);
  }
}
