
import { BadRequestException, Body, ConflictException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '@/modules/users/users.service';
import { comparePasswordHelper } from '@/helpers/normalizeArray.utils';
import { JwtService } from '@nestjs/jwt';
import { AdminLoginDto, CreateAuthDto, ResendOtpDto, ResetPasswordDto, SendForgotPasswordOTPDto, VerifyActivateOtpDto, VerifyResetPasswordOtpDto } from './dto/create-auth.dto';
import { OAuthDto } from './dto/oauth.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { StringValue } from 'ms';
import { createHash } from 'crypto';
import { hashRefreshToken } from '@/helpers/hashToken.util';
@Injectable()
export class AuthService {
    private refreshCache = new Map<string, { promise: Promise<{ access_token: string, refresh_token: string }>, expiresAt: number }>();

    constructor(
        private readonly usersService: UsersService,
        private jwtService: JwtService,
        private prisma: PrismaService,
        private configService: ConfigService,
    ) { }
    /**
     * Tạo cặp access_token + refresh_token
     */
    private generateTokenPair(payload: { username: string; sub: string }) {
        const access_token = this.jwtService.sign(payload);

        const refresh_token = this.jwtService.sign(payload, {
            secret: this.configService.getOrThrow<StringValue>('JWT_REFRESH_SECRET'),
            expiresIn: this.configService.getOrThrow<StringValue>('JWT_REFRESH_TOKEN_EXPIRES_IN'),
            jwtid: uuidv4(),
        });

        return { access_token, refresh_token };
    }

    async validateUser(username: string, password: string): Promise<any> {
        const user = await this.usersService.findByEmail(username);
        if (!user) {
            throw new BadRequestException('Email hoặc mật khẩu không chính xác');
        }
        if (!user.password) {
            throw new ConflictException(
                'Email này đã được đăng ký bằng Google hoặc GitHub. Vui lòng chọn đúng phương thức đăng nhập'
            );
        }
        const isValidPassword = await comparePasswordHelper(password, user?.password ?? '')
        if (!isValidPassword) {
            throw new BadRequestException('Email hoặc mật khẩu không chính xác');
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
            else if (user.status === false) {
                throw new UnauthorizedException({
                    statusCode: 401,
                    error: "Unauthorized",
                    message: 'Tài khoản của bạn đã bị khóa',
                });
            }
        }

        return user;
    }

    async login(user: any) {
        try {
            const payload = { username: user.email, sub: user.id };
            const { access_token, refresh_token } = this.generateTokenPair(payload);
            const refreshTokenPayload = this.jwtService.decode(refresh_token) as {
                exp: number;
            };
            await this.prisma.refreshToken.create({
                data: {
                    userId: user.id,
                    tokenHash: hashRefreshToken(refresh_token),
                    expiresAt: new Date(refreshTokenPayload.exp * 1000),
                },
            });
            return {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    avatar: user.avatar,
                },
                access_token,
                refresh_token,
            };
        }
        catch (error) {
            throw error;
        }

    }
    async register(registerDTO: CreateAuthDto) {
        return await this.usersService.handleRegister(registerDTO);
    }

    async oauthLogin(oauthDTO: OAuthDto) {
        const { email, name, avatar, provider, providerId } = oauthDTO;
        const providerKey = provider === 'google' ? 'googleId' : 'githubId';

        let user = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { [providerKey]: providerId },
                    { email: email },
                ],
            },
        });

        if (user) {
            if (user.deletedAt !== null || user.status === false) {
                throw new UnauthorizedException("Tài khoản của bạn đã bị xoá hoặc khoá. Vui lòng liên hệ cho đội ngũ CSKH để được hỗ trợ");
            }
            const updatedProviders = Array.from(new Set([...(user.provider ?? []), provider]))

            user = await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    isActive: true,
                    [providerKey]: providerId, // Tự động link ID nếu tài khoản cũ chưa có
                    provider: updatedProviders
                },
            });
        } else {
            // Nếu chưa có -> Tạo tài khoản mới
            user = await this.prisma.user.create({
                data: {
                    email,
                    name,
                    avatar,
                    isActive: true,
                    provider: [provider],
                    [providerKey]: providerId,
                },
            });
        }
        const payload = {
            username: user.email,
            sub: user.id,
        };

        const { access_token, refresh_token } = this.generateTokenPair(payload);
        const refreshTokenPayload = this.jwtService.decode(refresh_token) as {
            exp: number;
        };
        await this.prisma.refreshToken.create({
            data: {
                userId: user.id,
                tokenHash: hashRefreshToken(refresh_token),
                expiresAt: new Date(refreshTokenPayload.exp * 1000),
            },
        });
        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
            },
            access_token,
            refresh_token,
        };

    }

    async verifyActivateOtp(verifyActivateOtpDTO: VerifyActivateOtpDto) {
        return await this.usersService.handleVerifyActivateOtp(verifyActivateOtpDTO);
    }
    async resendOtp(resendOtpDTO: ResendOtpDto) {
        return await this.usersService.handleResendOtp(resendOtpDTO);
    }

    async sendResetPasswordOtp(sendForgotPasswordOTPDto: SendForgotPasswordOTPDto) {
        return await this.usersService.handleSendForgotPasswordOtp(sendForgotPasswordOTPDto);
    }
    async verifyResetOtp(verifyResetPasswordOtpDTO: VerifyResetPasswordOtpDto) {
        return await this.usersService.handleVerifyResetOtp(verifyResetPasswordOtpDTO);
    }
    async resetPassword(resetPasswordDTO: ResetPasswordDto) {
        return await this.usersService.handleResetPassword(resetPasswordDTO);
    }
    async adminLogin(adminLoginDto: AdminLoginDto) {
        const { email, password } = adminLoginDto;

        const user = await this.prisma.user.findFirst({
            where: {
                email: email,
                roles: {
                    some: {
                        role: {
                            name: 'ADMIN'
                        }
                    }
                }
            }
        })
        if (!user) {
            throw new BadRequestException('Email/Mật khẩu không chính xác')
        }
        if (!user.isActive) {
            throw new ForbiddenException('Tài khoản chưa được kích hoạt')
        }
        if (user.status === false) {
            throw new UnauthorizedException('Tài khoản bị khoá')
        }
        const isValidPassword = await comparePasswordHelper(password, user?.password ?? '')
        if (!isValidPassword) {
            throw new BadRequestException('Email/Mật khẩu không chính xác')
        }
        //generate token
        const payload = {
            username: user.email,
            sub: user.id,
        }
        const { access_token, refresh_token } = this.generateTokenPair(payload);
        const refreshTokenPayload = this.jwtService.decode(refresh_token) as {
            exp: number;
        };
        await this.prisma.refreshToken.create({
            data: {
                userId: user.id,
                tokenHash: hashRefreshToken(refresh_token),
                expiresAt: new Date(refreshTokenPayload.exp * 1000),
            },
        });
        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
            },
            access_token,
            refresh_token,
        }
    }

    /**
     * Refresh token: verify refresh_token cũ, tạo cặp token mới
     */
    async refreshToken(refreshToken: string) {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
            });
            const tokenHash = hashRefreshToken(refreshToken);

            // Check memory cache for recently refreshed tokens to handle concurrent requests (Grace Period)
            if (this.refreshCache.has(tokenHash)) {
                const cached = this.refreshCache.get(tokenHash);
                if (cached && cached.expiresAt > Date.now()) {
                    return await cached.promise;
                }
            }

            const refreshPromise = (async () => {
                const storedToken = await this.prisma.refreshToken.findUnique({
                    where: {
                        tokenHash: tokenHash,
                    }
                })
                if (!storedToken) {
                    throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
                }
                if (storedToken.revokedAt) {
                    // PHÁT HIỆN TẤN CÔNG LẶP LẠI (ABUSE DETECTION)
                    // Thu hồi toàn bộ token của User này ngay lập tức!
                    await this.prisma.refreshToken.updateMany({
                        where: {
                            userId: storedToken.userId,
                            revokedAt: null
                        },
                        data: { revokedAt: new Date() }
                    });
                    throw new UnauthorizedException('Cảnh báo bảo mật: Refresh token đã bị sử dụng lại. Toàn bộ phiên đăng nhập đã bị hủy.');
                }
                if (storedToken.expiresAt < new Date()) {
                    throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
                }
                if (payload.sub !== storedToken.userId) {
                    throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
                }
                // Tạo cặp token mới
                const newPayload = {
                    username: payload.username,
                    sub: payload.sub,
                    role: payload.role,
                };
                const { access_token, refresh_token: new_refresh_token } = this.generateTokenPair(newPayload);
                const newRefreshTokenPayload = this.jwtService.decode(new_refresh_token) as {
                    exp: number;
                };
                await this.prisma.$transaction([
                    this.prisma.refreshToken.update({
                        where: {
                            id: storedToken.id,
                        },
                        data: {
                            revokedAt: new Date(),
                        },
                    }),

                    this.prisma.refreshToken.create({
                        data: {
                            userId: payload.sub,
                            tokenHash: hashRefreshToken(
                                new_refresh_token
                            ),
                            expiresAt: new Date(
                                newRefreshTokenPayload.exp * 1000
                            ),
                        },
                    }),
                ]);
                return {
                    access_token,
                    refresh_token: new_refresh_token,
                };
            })();

            // Cache the promise for 15 seconds to handle race conditions
            this.refreshCache.set(tokenHash, {
                promise: refreshPromise,
                expiresAt: Date.now() + 15000,
            });

            // Cleanup old cache entries
            setTimeout(() => {
                this.refreshCache.delete(tokenHash);
            }, 15000);

            return await refreshPromise;
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            throw new UnauthorizedException(
                'Refresh token không hợp lệ hoặc đã hết hạn',
            );

        }
    }


    async getMe(userId: string) {
        try {
            const user = await this.prisma.user.findUnique({
                where: {
                    id: userId,
                },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    avatar: true,

                    roles: {
                        select: {
                            role: {
                                select: {
                                    name: true,
                                    permissions: {
                                        select: {
                                            permission: {
                                                select: {
                                                    name: true,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });
            if (!user) {
                throw new BadRequestException("Không tìm thấy tài khoản")
            }
            const roles = user.roles.map(
                (userRole) => userRole.role.name,
            );

            const permissions = [
                ...new Set(
                    user.roles.flatMap(
                        (role) =>
                            role.role.permissions.map(
                                (permission) =>
                                    permission.permission.name,
                            ),
                    ),
                ),
            ];

            return {
                id: user.id,
                email: user.email,
                name: user.name,
                avatar: user.avatar,
                roles,
                permissions,
            };
        }
        catch (err) {
            if (err instanceof BadRequestException) {
                throw err;
            }
            throw new InternalServerErrorException('Có lỗi xảy ra khi get user. Vui lòng thử lại sau');
        }

    }

    /**
     * Thu hồi refresh token khi user logout
     */
    async logout(refreshToken?: string) {
        if (!refreshToken) {
            return { message: 'Đăng xuất thành công' };
        }

        try {
            const tokenHash = hashRefreshToken(refreshToken);
            await this.prisma.refreshToken.updateMany({
                where: {
                    tokenHash: tokenHash,
                    revokedAt: null,
                },
                data: {
                    revokedAt: new Date(),
                },
            });
        } catch (error) {
            console.error('Lỗi khi thu hồi refresh token:', error);
        }

        return { message: 'Đăng xuất thành công' };
    }
}


