import { IsInt, IsNotEmpty, IsString, Max, Min } from "class-validator";

export class CreateCourseReviewDto {
    @IsString({message: 'Nội dung phải là chuỗi'})
    @IsNotEmpty({message: 'Nội dung không được để trống'})
    content!: string;

    @IsInt({message: 'Rating phải là số nguyên'})
    @Min(1, {message: 'Rating phải từ 1 đến 5'})
    @Max(5, {message: 'Rating phải từ 1 đến 5'})
    rating!: number;
}
