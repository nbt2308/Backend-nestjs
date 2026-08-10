import { PartialType } from '@nestjs/mapped-types';
import { CreateTagDto } from './create-tag.dto';
import { ArrayNotEmpty, IsArray, IsBoolean, IsNotEmpty, IsNumber, IsString } from 'class-validator';
export class UpdateTagDto extends PartialType(CreateTagDto) { }

export class BulkStatusDto {
    @IsArray({ message: 'Dữ liệu truyền vào phải là mảng' })
    @ArrayNotEmpty({ message: 'Danh sách ID không được để trống' })
    @IsNumber({}, { each: true, message: 'Mỗi ID trong mảng phải là một số' })
    ids!: number[];

    @IsBoolean({ message: 'Trạng thái không đúng định dạng' })
    @IsNotEmpty({ message: 'Trạng thái không được để trống' })
    status!: boolean;
}
export class BulkDeleteDto {
    @IsArray({ message: 'Dữ liệu truyền vào phải là mảng' })
    @ArrayNotEmpty({ message: 'Danh sách ID không được để trống' })
    @IsNumber({}, { each: true, message: 'Mỗi ID trong mảng phải là một số' })
    ids!: number[];
}
export class ChangeStatusDto {
    @IsNumber({}, { message: 'ID phải là số' })
    @IsNotEmpty({ message: 'ID không được để trống' })
    id!: number;

    @IsBoolean({ message: 'Trạng thái không đúng định dạng' })
    @IsNotEmpty({ message: 'Trạng thái không được để trống' })
    status!: boolean;
}
