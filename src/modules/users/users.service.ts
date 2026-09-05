import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { BulkDeleteDto, BulkStatusDto, ChangeStatusDto, UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { comparePasswordHelper, hashPasswordHelper } from '@/helpers/normalizeArray.utils';
import { CreateAuthDto, ResendOtpDto, ResetPasswordDto, SendForgotPasswordOTPDto, VerifyActivateOtpDto, VerifyResetPasswordOtpDto } from '@/auth/dto/create-auth.dto';
import { nanoid, customAlphabet } from 'nanoid'
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { MailService } from '@/mail/mail.service';
import { OAuthDto } from '@/auth/dto/oauth.dto';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import { uuidv7 } from "uuidv7";
import { RoleName } from './dto/create-user.dto';
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
            const { name, email, phone, password, role } = createUserDto;
            const checkEmailOrPhoneExist = await this.checkEmailOrPhoneExist(email, phone)
            if (!checkEmailOrPhoneExist) {
                throw new BadRequestException('Email hoặc số điện thoại đã tồn tại')
            }

            const roleRecord = await this.prisma.role.findUnique({
                where: { name: role },
            });

            if (!roleRecord) {
                throw new BadRequestException('Vai trò không hợp lệ');
            }

            const hashPassword = await hashPasswordHelper(password);
            const id = uuidv7();
            const user = await this.prisma.user.create({
                data: {
                    id,
                    name,
                    email,
                    phone,
                    password: hashPassword,
                    status: true,
                    isActive: true,
                    provider: ['local'],
                    roles: {
                        create: {
                            roleId: roleRecord.id,
                        },
                    },
                },
            });

            return {
                id: user.id,
                role: roleRecord.name,
            };
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Tạo người dùng thất bại');
        }

    }

    async findAll(page: number, limit: number, sortBy: string, sortOrder: 'asc' | 'desc', search?: string) {
        const allowedFields = ['name', 'email', 'createdAt'];
        const finalSortBy = allowedFields.includes(sortBy) ? sortBy : 'createdAt';

        const whereCondition: any = {
            deletedAt: null
        };

        if (search && search.trim() !== "") {
            whereCondition.OR = [
                {
                    name: {
                        contains: search.trim(),
                        mode: 'insensitive', // Không phân biệt chữ hoa / chữ thường (Chỉ hỗ trợ tốt trên PostgreSQL)
                    },
                },
                {
                    email: {
                        contains: search.trim(),
                        mode: 'insensitive',
                    },
                },
            ];
        }

        const skip = (page - 1) * limit;
        const take = limit;
        const [users, totalItems] = await Promise.all([
            this.prisma.user.findMany({
                where: whereCondition,
                skip: skip,
                take: take,
                orderBy: {
                    [finalSortBy]: sortOrder
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true,
                    phone: true,
                    address: true,
                    isActive: true,
                    status: true,
                    provider: true,
                    createdAt: true,
                    updatedAt: true,
                    roles: {
                        select: {
                            role: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                        },
                    },
                },
            }),
            this.prisma.user.count({
                where: whereCondition
            })
        ])

        const normalizedUsers = users.map((user) => ({
            ...user,
            roles: user.roles?.map((role) => ({ id: role.role.id, name: role.role.name })) ?? [],
        }));

        const totalPages = Math.ceil(totalItems / take);
        return { users: normalizedUsers, totalItems, totalPages };
    }

    findOne(id: number) {
        return `This action returns a #${id} user`;
    }

    async findAllInstructor() {
        try {
            return this.prisma.user.findMany({
                where: {
                    roles: {
                        some: {
                            role: {
                                name: 'INSTRUCTOR',
                            },
                        },
                    },
                    status: true,
                    deletedAt: null,
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    address: true,
                    avatar: true,
                },
            });
        } catch (error) {
            throw new InternalServerErrorException('Có lỗi xảy ra khi lấy danh sách giảng viên');
        }
    }

    async findByEmail(email: string) {
        return await this.prisma.user.findFirst({
            where: {
                email: email,
                deletedAt: null
            }
        })
    }

    async bulkStatus(bulkStatusDto: BulkStatusDto) {
        try {
            const { ids, status } = bulkStatusDto;
            const result = await this.prisma.user.updateMany({
                where: {
                    id: {
                        in: ids
                    }
                },
                data: {
                    status: status
                }
            })
            return {
                count: result.count
            }
        } catch (error) {
            throw new InternalServerErrorException('Có lỗi xảy ra khi cập nhật trạng thái người dùng');
        }
    }

    async bulkDelete(bulkDeleteDto: BulkDeleteDto) {
        try {
            const { ids } = bulkDeleteDto;
            const users = await this.prisma.user.findMany({
                where: {
                    id: {
                        in: ids
                    }
                },
                include: {
                    roles: {
                        include: {
                            role: true,
                        },
                    },
                },
            });

            if (users.some((u) => u.roles.some((roleItem) => roleItem.role.name === 'ADMIN'))) {
                throw new BadRequestException("Không thể xóa Admin");
            }

            const result = await this.prisma.user.updateMany({
                where: {
                    id: {
                        in: ids
                    }
                },
                data: {
                    deletedAt: new Date()
                }
            })
            return {
                count: result.count
            }
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Có lỗi xảy ra khi xóa người dùng');
        }
    }

    async update(id: string, updateUserDto: UpdateUserDto) {
        try {
            const { name, phone, address, role, status } = updateUserDto;

            //check user exist
            const user = await this.prisma.user.findUnique({
                where: {
                    id: id
                },
                include: {
                    roles: {
                        include: {
                            role: true,
                        },
                    },
                    _count: {
                        select: {
                            courses: true
                        }
                    }
                }
            })
            if (!user) {
                throw new NotFoundException('Không tìm thấy người dùng')
            }

            const hasInstructorRole = user.roles.some((userRole) => userRole.role.name === 'INSTRUCTOR');
            const isChangingFromInstructor = hasInstructorRole && role && role !== 'INSTRUCTOR';
            const hasActiveCourses = user._count.courses > 0;
            if (isChangingFromInstructor && hasActiveCourses) {
                throw new BadRequestException("Không thể thay đổi vai trò của giảng viên này vì hiện đang dạy trong 1 khoá học nào đó");
            }

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

            if (role) {
                const targetRole = await this.prisma.role.findUnique({
                    where: { name: role },
                });

                if (!targetRole) {
                    throw new BadRequestException('Vai trò không hợp lệ');
                }

                await this.prisma.userRole.deleteMany({
                    where: { userId: id },
                });

                await this.prisma.userRole.create({
                    data: {
                        userId: id,
                        roleId: targetRole.id,
                    },
                });
            }

            const updateUser = await this.prisma.user.update({
                where: {
                    id: id
                },
                data: {
                    name: name,
                    phone: phone,
                    address: address,
                    status: status,
                },
                include: {
                    roles: {
                        include: {
                            role: true,
                        },
                    },
                },
            })
            return {
                id: updateUser.id,
                name: updateUser.name,
                email: updateUser.email,
                phone: updateUser.phone,
                address: updateUser.address,
                role: updateUser.roles[0]?.role.name ?? null,
                status: updateUser.status,
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

    async changeStatus(changeStatusDto: ChangeStatusDto) {
        try {
            const { id, status } = changeStatusDto;
            const user = await this.prisma.user.findUnique({
                where: {
                    id: id
                }
            })
            if (!user) {
                throw new NotFoundException('Không tìm thấy người dùng')
            }
            const changeStatusUser = await this.prisma.user.update({
                where: {
                    id: id
                },
                data: {
                    status: status
                }
            })
            return {
                id: changeStatusUser.id,
                email: changeStatusUser.email
            }
        }
        catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Có lỗi xảy ra khi thay đổi trạng thái');
        }
    }

    async remove(id: string) {
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

    async softDelete(id: string) {
        try {
            const user = await this.prisma.user.findUnique({
                where: {
                    id: id
                },
                include: {
                    roles: {
                        include: {
                            role: true,
                        },
                    },
                },
            })
            if (!user) {
                throw new NotFoundException('Không tìm thấy người dùng')
            }
            if (user.roles.some((userRole) => userRole.role.name === 'ADMIN')) {
                throw new BadRequestException('Không thể xoá Admin')
            }
            return await this.prisma.user.update({
                where: { id },
                data: { deletedAt: new Date() },
            })
        }
        catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Có lỗi xảy ra khi xoá người dùng');
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
        const verifyToken = uuidv4();
        const verifyTokenExpired = dayjs().utc().add(Number(process.env.VERIFY_TOKEN_EXPIRED), 'minute').toDate();
        const user = await this.prisma.user.create({
            data: {
                email: registerDTO.email,
                phone: registerDTO.phone,
                password: hashPassword,
                name: registerDTO.name,
                isActive: false,
                codeId: codeID,
                codeExpired: codeExpired,
                verifyToken: verifyToken,
                verifyTokenExpired: verifyTokenExpired,
                provider: ["local"],
                roles: {
                    create: {
                        role: {
                            connect: {
                                name: 'USER',
                            },
                        },
                    },
                },
            }
        })
        //send email to verify account
        await this.mailService.sendVerifyEmail(user.email, user.name, codeID);
        return {
            id: user.id,
            verifyToken: user.verifyToken
        };
    }

    async handleVerifyActivateOtp(verifyActivateOtpDTO: VerifyActivateOtpDto) {
        try {
            const { verifyToken, codeId } = verifyActivateOtpDTO;
            const user = await this.prisma.user.findFirst({
                where: {
                    verifyToken: verifyToken
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
            //check verify token expired
            const isVerifyTokenExpired = dayjs(user.verifyTokenExpired).isBefore(dayjs());
            if (!user.verifyTokenExpired || isVerifyTokenExpired) {
                throw new BadRequestException('Verify token đã hết hạn')
            }
            //check code id expired
            const isCodeExpired = dayjs(user.codeExpired).isBefore(dayjs());
            if (!user.codeExpired || isCodeExpired) {
                throw new BadRequestException('Mã xác thực đã hết hạn')
            }
            const updateUser = await this.prisma.user.update({
                where: {
                    id: user.id
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

            const user = await this.prisma.user.findFirst({
                where: {
                    verifyToken: resendOtpDTO.verifyToken
                }
            })
            if (!user) {
                throw new NotFoundException('Không tìm thấy người dùng')
            }
            //check verify token expired
            const isVerifyTokenExpired = dayjs(user.verifyTokenExpired).isBefore(dayjs());
            if (!user.verifyTokenExpired || isVerifyTokenExpired) {
                throw new BadRequestException('Verify token đã hết hạn')
            }

            if (user.codeExpired && now - user.codeExpired.getTime() < requestLimitMs) {
                const remainMs = requestLimitMs - (now - user.codeExpired.getTime());
                const remainMinutes = Math.ceil(remainMs / 60000);
                throw new BadRequestException(`Vui lòng chờ ${remainMinutes} phút để gửi lại mã`);
            }
            const codeID = customAlphabet(String(process.env.CODE_ID_RULE), 6)();
            const codeExpired = dayjs().utc().add(Number(process.env.CODE_EXPIRED), 'minute').toDate();
            const updateUser = await this.prisma.user.update({
                where: {
                    id: user.id
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

    async handleSendForgotPasswordOtp(sendForgotPasswordOTPDto: SendForgotPasswordOTPDto) {
        try {
            const { email } = sendForgotPasswordOTPDto;
            const now = Date.now();
            const requestLimitMs = 2 * 60 * 1000;

            const user = await this.prisma.user.findFirst({
                where: {
                    email: email
                }
            })
            if (!user) {
                throw new NotFoundException('Không tìm thấy người dùng')
            }
            if (!user.password) {
                throw new BadRequestException('Email này đã được đăng ký bằng các phương thức khác. Vui lòng chọn đúng phương thức đăng nhập')
            }

            //rate limit
            const existingReset = await this.prisma.password_Resets.findFirst({
                where: {
                    email: email
                }
            })
            if (existingReset && now - existingReset.createdAt.getTime() < requestLimitMs) {
                const remainMs = requestLimitMs - (now - existingReset.createdAt.getTime());
                const remainMinutes = Math.ceil(remainMs / 60000);
                throw new BadRequestException(`Vui lòng chờ ${remainMinutes} phút để gửi lại mã`);
            }
            const codeID = customAlphabet(String(process.env.CODE_ID_RULE), 6)();
            const codeExpired = dayjs().utc().add(Number(process.env.CODE_EXPIRED), 'minute').toDate();
            const updateReset = await this.prisma.password_Resets.upsert({
                where: {
                    email: email
                },
                update: {
                    codeId: codeID,
                    codeExpired: codeExpired,
                    is_verified: false,
                    createdAt: new Date()
                },
                create: {
                    email: email,
                    codeId: codeID,
                    codeExpired: codeExpired
                }
            })
            //send email
            await this.mailService.sendForgotPasswordOTPEmail(email, user.name, codeID);
            return {
                email: updateReset.email
            }
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Có lỗi xảy ra khi gửi mã OTP');
        }
    }

    async handleVerifyResetOtp(verifyResetPasswordOtpDTO: VerifyResetPasswordOtpDto) {
        try {
            const { email, codeId } = verifyResetPasswordOtpDTO;
            const resetSession = await this.prisma.password_Resets.findFirst({
                where: {
                    email: email
                }
            })
            if (!resetSession) {
                throw new NotFoundException('Không tìm thấy phiên đặt lại mật khẩu')
            }

            if (resetSession.is_verified) {
                throw new BadRequestException('Phiên đặt lại mật khẩu đã được xác thực')
            }

            if (resetSession.codeId !== codeId) {
                throw new BadRequestException('Mã xác thực không chính xác')
            }
            //check code id expired
            const isCodeExpired = dayjs(resetSession.codeExpired).isBefore(dayjs());
            if (!resetSession.codeExpired || isCodeExpired) {
                throw new BadRequestException('Mã xác thực đã hết hạn')
            }
            const updateSession = await this.prisma.password_Resets.update({
                where: {
                    email: email
                },
                data: {
                    is_verified: true,
                    updatedAt: new Date()
                }
            })
            return true;
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

    async handleResetPassword(resetPasswordDTO: ResetPasswordDto) {
        try {
            const { email, password } = resetPasswordDTO;
            const resetSession = await this.prisma.password_Resets.findFirst({
                where: {
                    email: email,
                    is_verified: true
                }
            })
            if (!resetSession) {
                throw new NotFoundException('Không tìm thấy phiên đặt lại mật khẩu')
            }

            if (!resetSession.is_verified) {
                throw new BadRequestException('Phiên đặt lại mật khẩu chưa được xác thực')
            }

            if (resetSession.updatedAt && dayjs().isAfter(dayjs(resetSession.updatedAt).add(Number(process.env.RESET_PASSWORD_SESSION_EXPIRED), 'minute'))) {
                throw new BadRequestException('Phiên đặt lại mật khẩu đã hết hạn. Vui lòng thực hiện lại từ đầu')
            }
            //check password same
            const user = await this.prisma.user.findFirst({
                where: {
                    email: email
                }
            })
            if (user) {
                const isValidPassword = await comparePasswordHelper(password, user?.password ?? '')
                if (isValidPassword) {
                    throw new BadRequestException('Mật khẩu mới không được trùng với mật khẩu cũ')
                }
            }
            const hashPassword = await hashPasswordHelper(password);
            await this.prisma.user.update({
                where: {
                    email: email
                },
                data: {
                    password: hashPassword
                }
            })
            await this.prisma.password_Resets.delete({
                where: {
                    email: email
                }
            })
            return true;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Có lỗi xảy ra khi đặt lại mật khẩu');
        }
    }
}
