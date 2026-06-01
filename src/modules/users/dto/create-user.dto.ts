import { Role } from "@/generated/prisma/enums";
import { IsEmail, IsEmpty, IsNotEmpty, IsPhoneNumber, IsString, MaxLength, MinLength } from "class-validator";

export class CreateUserDto {
    @IsNotEmpty({ message: 'Tên không được để trống' })
    name!: string;
    // @IsNotEmpty({ message: 'Địa chỉ không được để trống' })
    // address!: string;
    // @IsNotEmpty({ message: 'Avatar không được để trống' })
    // avatar!: string;
    @IsNotEmpty({ message: 'Role không được để trống' })
    role!: Role;

    @IsEmail({}, { message: 'Email không đúng định dạng' })
    @IsNotEmpty({ message: 'Email không được để trống' })
    email!: string;

    @IsPhoneNumber('VN', { message: 'Số điện thoại không đúng định dạng' })
    // @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
    phone!: string;

    @IsString()
    @MinLength(6)
    @MaxLength(16)
    password!: string;


}
