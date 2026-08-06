import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateSectionDto {
    @IsString({ message: 'Tiêu đề không hợp lệ' })
    @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
    title!: string;

    @IsNumber({}, { message: 'Thứ tự phải là số' })
    @IsNotEmpty({ message: 'Thứ tự không được để trống' })
    order!: number;

    @IsString({ message: 'Mã khóa học không hợp lệ' })
    @IsNotEmpty({ message: 'Mã khóa học không được để trống' })
    courseId!: string;
}
