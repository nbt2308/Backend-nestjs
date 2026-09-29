import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên danh mục không được để trống' })
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  thumbnail?: string;

  @IsBoolean()
  @IsOptional()
  status?: boolean;

  @IsInt()
  @IsOptional()
  parentId?: number;
}
