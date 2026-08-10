import { CourseType, Level } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, IsBoolean, IsDecimal, IsEnum, ValidateIf, Max, IsArray } from 'class-validator';

export class CreateCourseDto {
    @IsString({ message: 'Tiêu đề phải là chuỗi' })
    @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
    title!: string;

    @IsString({ message: 'Mô tả phải là chuỗi' })
    @IsNotEmpty({ message: 'Mô tả không được để trống' })
    description!: string;

    @Transform(({ value }) => (value !== '' && value !== undefined && value !== null ? Number(value) : 0))
    @IsOptional()
    @IsNumber({}, { message: 'Giá phải là số' })
    @Min(0, { message: 'Giá phải lớn hơn hoặc bằng 0' })
    price!: number;

    @Transform(({ value }) => (value !== '' && value !== undefined && value !== null ? Number(value) : 0))
    @IsOptional()
    @IsNumber({}, { message: 'Giá giảm phải là số' })
    @Min(0, { message: 'Giá giảm phải lớn hơn hoặc bằng 0' })
    discount!: number;

    @IsArray({ message: 'Tags phải là một mảng' })
    @IsNumber({}, { each: true, message: 'Mỗi Tag phải có định dạng số' })
    @IsNotEmpty({ message: 'Tag không được để trống' })
    tags!: number[];

    @IsEnum(["BEGINNER", "INTERMEDIATE", "ADVANCED"], { message: 'Cấp độ phải là một trong các giá trị: BEGINNER, INTERMEDIATE, ADVANCED' })
    @IsNotEmpty({ message: 'Cấp độ không được để trống' })
    level!: Level;

    @IsEnum(["FREE", "PAID"], { message: 'Loại khóa học phải là một trong các giá trị: FREE, PAID' })
    @IsNotEmpty({ message: 'Loại khóa học không được để trống' })
    courseType!: CourseType;

    @IsString({ message: 'Ảnh đại diện phải là chuỗi' })
    @IsOptional()
    thumbnail?: string;

    @IsString()
    @IsOptional()
    thumbnail_publicID?: string;

    @IsBoolean({ message: 'Trạng thái không hợp lệ' })
    @IsNotEmpty({ message: 'Trạng thái không được để trống' })
    status!: boolean;

    @IsString({ message: 'ID của giảng viên phải là chuỗi' })
    @IsNotEmpty({ message: 'ID của giảng viên không được để trống' })
    instructorId!: string;
}
