import { ArrayNotEmpty, IsArray, IsBoolean, IsIn, IsNotEmpty, IsOptional, IsPhoneNumber, IsString } from "class-validator";

export type RoleName = 'ADMIN' | 'INSTRUCTOR' | 'USER';

export class UpdateUserDto {
    @IsNotEmpty({ message: 'ID không được để trống' })
    @IsString({ message: 'ID phải là chuỗi' })
    id!: string;

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
    @IsIn(['ADMIN', 'INSTRUCTOR', 'USER'], { message: 'Vai trò không hợp lệ' })
    role?: RoleName;

    @IsOptional()
    @IsBoolean({ message: 'Trạng thái không hợp lệ' })
    status?: boolean;
}

export class BulkStatusDto {
    @IsArray({ message: 'Dữ liệu truyền vào phải là mảng' })
    @ArrayNotEmpty({ message: 'Danh sách ID không được để trống' })
    @IsString({ each: true, message: 'Mỗi ID trong mảng phải là một chuỗi ký tự' })
    ids!: string[];

    @IsBoolean({ message: 'Trạng thái không đúng định dạng' })
    @IsNotEmpty({ message: 'Trạng thái không được để trống' })
    status!: boolean;
}
export class BulkDeleteDto {
    @IsArray({ message: 'Dữ liệu truyền vào phải là mảng' })
    @ArrayNotEmpty({ message: 'Danh sách ID không được để trống' })
    @IsString({ each: true, message: 'Mỗi ID trong mảng phải là một chuỗi ký tự' })
    ids!: string[];
}
export class ChangeStatusDto {
    @IsString({ message: 'ID phải là chuỗi' })
    @IsNotEmpty({ message: 'ID không được để trống' })
    id!: string;

    @IsBoolean({ message: 'Trạng thái không đúng định dạng' })
    @IsNotEmpty({ message: 'Trạng thái không được để trống' })
    status!: boolean;
}
