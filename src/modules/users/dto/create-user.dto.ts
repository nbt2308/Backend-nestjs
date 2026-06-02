import { Role } from "@prisma/client";
import { IsEmail, IsEmpty, IsEnum, IsNotEmpty, IsPhoneNumber, IsString, MaxLength, MinLength } from "class-validator";

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


    @MinLength(6)
    @MaxLength(16)
    password!: string;


}
