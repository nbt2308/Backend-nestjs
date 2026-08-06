import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateSectionDto {
    @IsString({ message: 'Tiêu đề không hợp lệ' })
    @IsOptional()
    title?: string;

    @IsNumber({}, { message: 'Thứ tự phải là số' })
    @IsOptional()
    order?: number;

    @IsString({ message: 'Mã khóa học không hợp lệ' })
    @IsNotEmpty({ message: 'Mã khóa học không được để trống' })
    courseId!: string;
}
