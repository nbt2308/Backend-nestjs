import { PartialType } from '@nestjs/mapped-types';
import { CreateCourseDto } from './create-course.dto';
import { ArrayNotEmpty, IsArray, IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CourseStatus } from '@prisma/client';

export class UpdateCourseDto extends PartialType(CreateCourseDto) {
    @IsOptional()
    @IsEnum(CourseStatus, { message: 'Trạng thái không hợp lệ' })
    status?: CourseStatus;

    @IsOptional()
    @IsString({ message: 'Lý do từ chối phải là chuỗi' })
    reason_rejected?: string;
}

export class SubmitCourseDto {
    @IsString({ message: 'ID phải là chuỗi' })
    @IsNotEmpty({ message: 'ID không được để trống' })
    id!: string;
}

export class ApproveCourseDto {
    @IsString({ message: 'ID phải là chuỗi' })
    @IsNotEmpty({ message: 'ID không được để trống' })
    id!: string;
}

export class BulkApproveCourseDto {
    @IsArray({ message: 'Dữ liệu truyền vào phải là mảng' })
    @ArrayNotEmpty({ message: 'Danh sách ID không được để trống' })
    @IsString({ each: true, message: 'Mỗi ID trong mảng phải là một chuỗi ký tự' })
    ids!: string[];
}

export class RejectCourseDto {
    @IsString({ message: 'ID phải là chuỗi' })
    @IsNotEmpty({ message: 'ID không được để trống' })
    id!: string;

    @IsString({ message: 'Lý do từ chối phải là chuỗi' })
    @IsNotEmpty({ message: 'Lý do từ chối không được để trống' })
    reason_rejected!: string;
}

export class UnpublishCourseDto {
    @IsString({ message: 'ID phải là chuỗi' })
    @IsNotEmpty({ message: 'ID không được để trống' })
    id!: string;
}

export class AdminDeleteCourseDto {
    @IsString({ message: 'Lý do xóa phải là chuỗi' })
    @IsNotEmpty({ message: 'Lý do xóa không được để trống' })
    deletedReason!: string;
}

export class BulkDeleteDto {
    @IsArray({ message: 'Dữ liệu truyền vào phải là mảng' })
    @ArrayNotEmpty({ message: 'Danh sách ID không được để trống' })
    @IsString({ each: true, message: 'Mỗi ID trong mảng phải là một chuỗi ký tự' })
    ids!: string[];
}
