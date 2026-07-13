import { Role } from "@prisma/client";
import { IsBoolean, IsEmail, IsEmpty, IsEnum, IsNotEmpty, IsPhoneNumber, IsString, MaxLength, MinLength } from "class-validator";

export class CreateUserDto {
    @IsNotEmpty({ message: 'Tên không được để trống' })
    // @IsString()
    name!: string;

    @IsEmail({}, { message: 'Email không đúng định dạng' })
    @IsNotEmpty({ message: 'Email không được để trống' })
    email!: string;

    @IsPhoneNumber('VN', { message: 'Số điện thoại không đúng định dạng' })
    // @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
    phone!: string;


    @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
    @MaxLength(32, { message: 'Mật khẩu không được vượt quá 32 ký tự' })
    password!: string;

    @IsEnum(Role, { message: 'Vai trò không hợp lệ' })
    @IsNotEmpty({ message: 'Vai trò không được để trống' })
    role!: Role;

    @IsBoolean({ message: 'Trạng thái không hợp lệ' })
    @IsNotEmpty({ message: 'Trạng thái không được để trống' })
    status!: boolean;


}
