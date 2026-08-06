import {
    IsString,
    IsInt,
    IsBoolean,
    IsOptional,
    Min,
    IsUrl,
    Matches,
    MaxLength,
    Length,
    ValidateIf,
    IsNotEmpty,
} from 'class-validator';

export class CreateLessonDto {
    @IsString()
    @MaxLength(255, { message: 'Tiêu đề không được vượt quá 255 ký tự' })
    @Length(1, 255, { message: 'Tiêu đề không được để trống' })
    title!: string;

    @IsNotEmpty({ message: 'Đường dẫn Video không được để trống' })
    @IsString()
    @IsUrl(undefined, { message: 'Đường dẫn Video phải là một URL hợp lệ' })
    @Matches(
        /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(\&.*)?$/,
        {
            message: 'URL phải là link video YouTube hợp lệ',
        }
    )
    videoUrl!: string;

    @IsOptional()
    @IsString()
    content?: string;

    @IsInt()
    @Min(0, { message: 'Thứ tự của bài học không được để trống' })
    order!: number;

    @IsBoolean()
    isPreview!: boolean;

    @IsInt()
    @Min(1, { message: 'ID của Chương không được để trống' })
    sectionId!: number;
}
