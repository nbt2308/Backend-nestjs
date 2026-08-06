import { PartialType } from '@nestjs/mapped-types';
import { CreateCourseDto } from './create-course.dto';
import { ArrayNotEmpty, IsArray, IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class UpdateCourseDto extends PartialType(CreateCourseDto) { }

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
