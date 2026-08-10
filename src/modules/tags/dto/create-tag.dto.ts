import { Transform } from "class-transformer";
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

export class CreateTagDto {
    @IsString({ message: "Tên phải là chuỗi" })
    @IsNotEmpty({ message: "Tên không được để trống" })
    @MinLength(1, { message: "Tên phải có ít nhất 1 ký tự" })
    @MaxLength(100, { message: "Tên phải có tối đa 100 ký tự" })
    name!: string;


    @IsOptional()
    @Transform(({ value }) => value?.trim() === '' ? null : value)
    @IsString({ message: "Mô tả phải là chuỗi" })
    @MinLength(1, { message: "Mô tả phải có ít nhất 1 ký tự" })
    @MaxLength(500, { message: "Mô tả phải có tối đa 500 ký tự" })
    description?: string;

    @IsBoolean({ message: "Trạng thái không hợp lệ" })
    @IsNotEmpty({ message: 'Trạng thái không được để trống' })
    // @Transform(({ value }) => value === 'true')
    status!: boolean;
}
