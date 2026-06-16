import { IsEmail, IsNotEmpty, IsOptional, IsPhoneNumber, MaxLength, MinLength } from "class-validator";

export class OAuthDto {
    @IsNotEmpty({ message: 'Email không được để trống' })
    @IsEmail({}, { message: 'Email không đúng định dạng' })
    email!: string;

    @IsNotEmpty({ message: 'Tên không được để trống' })
    name!: string;

    @IsOptional()
    avatar?: string;

    @IsNotEmpty({ message: 'Provider không được để trống' })
    provider!: string;

    @IsNotEmpty({ message: 'ProviderId không được để trống' })
    providerId!: string;

}
