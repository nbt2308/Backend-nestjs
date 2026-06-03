import { IsEmail, IsNotEmpty, MaxLength, MinLength } from "class-validator";

export class CreateAuthDto {
    @IsNotEmpty({ message: 'Email không được để trống' })
    @IsEmail({}, { message: 'Email không đúng định dạng' })
    email!: string;

    @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
    @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
    @MaxLength(16, { message: 'Mật khẩu không được vượt quá 16 ký tự' })
    password!: string;
}
