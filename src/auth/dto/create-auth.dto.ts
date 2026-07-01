import { IsEmail, IsNotEmpty, IsPhoneNumber, IsString, Length, MaxLength, MinLength } from "class-validator";

export class CreateAuthDto {
    @IsNotEmpty({ message: 'Email không được để trống' })
    @IsEmail({}, { message: 'Email không đúng định dạng' })
    email!: string;

    @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
    @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
    @MaxLength(32, { message: 'Mật khẩu không được vượt quá 32 ký tự' })
    password!: string;

    @IsPhoneNumber('VN', { message: 'Số điện thoại không đúng định dạng' })
    phone!: string;

    @IsNotEmpty({ message: 'Tên không được để trống' })
    name!: string;
}

export class VerifyActivateOtpDto {
    @IsNotEmpty({ message: 'Code ID không được để trống' })
    @Length(6, 6, { message: 'Code ID phải có 6 ký tự' })
    codeId!: string;

    @IsNotEmpty({ message: 'Verify token không được để trống' })
    @IsString()
    verifyToken!: string;
}
export class ResendOtpDto {
    @IsNotEmpty({ message: 'Verify token không được để trống' })
    verifyToken!: string;
}

export class SendForgotPasswordOTPDto {
    @IsNotEmpty({ message: 'Email không được để trống' })
    @IsEmail({}, { message: 'Email không đúng định dạng' })
    email!: string;
}
export class VerifyResetPasswordOtpDto {
    @IsNotEmpty({ message: 'Email không được để trống' })
    @IsEmail({}, { message: 'Email không đúng định dạng' })
    email!: string;

    @IsNotEmpty({ message: 'Code ID không được để trống' })
    @Length(6, 6, { message: 'Code ID phải có 6 ký tự' })
    codeId!: string;
}
export class ResetPasswordDto {
    @IsNotEmpty({ message: 'Email không được để trống' })
    @IsEmail({}, { message: 'Email không đúng định dạng' })
    email!: string;

    @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
    @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
    @MaxLength(32, { message: 'Mật khẩu không được vượt quá 32 ký tự' })
    password!: string;
}
export class AdminLoginDto {
    @IsNotEmpty({ message: 'Email không được để trống' })
    @IsEmail({}, { message: 'Email không đúng định dạng' })
    email!: string;

    @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
    @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
    @MaxLength(32, { message: 'Mật khẩu không được vượt quá 32 ký tự' })
    password!: string;
}


