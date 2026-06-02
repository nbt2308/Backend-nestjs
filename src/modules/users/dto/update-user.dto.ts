import { IsInt, IsNotEmpty, IsOptional, IsPhoneNumber, IsString, MaxLength, MinLength, ValidateIf } from "class-validator";

export class UpdateUserDto {
    @IsNotEmpty({ message: 'ID không được để trống' })
    @IsInt({ message: 'ID phải là số' })
    id!: number;

    @IsOptional()
    @IsNotEmpty({ message: 'Tên không được để trống' })
    @IsString({ message: 'Tên phải là chuỗi' })
    name?: string;

    @IsOptional()
    @IsPhoneNumber('VN', { message: 'Số điện thoại không đúng định dạng' })
    phone?: string;

    @IsOptional()
    @IsString({ message: 'Địa chỉ phải là chuỗi' })
    address?: string;

    @IsOptional()
    @IsString({ message: 'Avatar phải là chuỗi' })
    avatar?: string;
}
