import { Transform } from "class-transformer";
import { ArrayUnique, IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class CreateRoleDto {
    @IsString({ message: "Tên phải là chuỗi" })
    @IsNotEmpty({ message: "Tên không được để trống" })
    @MinLength(1, { message: "Tên phải có ít nhất 1 ký tự" })
    @MaxLength(100, { message: "Tên phải có tối đa 100 ký tự" })
    @Transform(({ value }) =>
        value
            .trim()
            .replace(/\s+/g, '_')
            .toUpperCase(),
    )
    @Matches(/^[A-Z][A-Z0-9_]*$/, {
        message: 'Tên role chỉ được chứa chữ cái in hoa, số và dấu gạch dưới.',
    })
    name!: string;

    @IsString({ message: "Mô tả phải là chuỗi" })
    @IsOptional()
    description?: string;

    @IsArray({ message: 'permissionIds phải là mảng' })
    @ArrayUnique()
    @IsOptional()
    @IsNumber({}, { each: true, message: 'Mỗi permissionId phải là số' })
    permissionIds?: number[];
}
