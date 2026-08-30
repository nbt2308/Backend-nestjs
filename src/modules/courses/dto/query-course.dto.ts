import { Transform, Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

const splitQueryValues = (value: unknown) => {
    if (value === undefined || value === null || value === '') return undefined;

    if (Array.isArray(value)) {
        return value
            .flatMap((item) => String(item).split(','))
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return String(value)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
};

export class QueryCourseDto {
    @Type(() => Number)
    @IsOptional()
    @IsNumber({}, { message: 'page phải là số' })
    page?: number = 1;

    @Type(() => Number)
    @IsOptional()
    @IsNumber({}, { message: 'limit phải là số' })
    limit?: number = 10;

    @IsOptional()
    @IsIn(['createdAt', 'price', 'discount', 'studentCount', 'averageRating', 'title'], {
        message: 'sortBy không hợp lệ',
    })
    sortBy?: 'createdAt' | 'price' | 'discount' | 'studentCount' | 'averageRating' | 'title' = 'createdAt';

    @IsOptional()
    @IsIn(['asc', 'desc'], { message: 'sortOrder phải là asc hoặc desc' })
    sortOrder?: 'asc' | 'desc' = 'desc';

    @IsOptional()
    @IsString({ message: 'search phải là chuỗi' })
    search?: string;

    @Transform(({ value }) => splitQueryValues(value))
    @IsOptional()
    level?: string[];

    @Transform(({ value }) => splitQueryValues(value))
    @IsOptional()
    courseType?: string[];

    @Transform(({ value }) => splitQueryValues(value))
    @IsOptional()
    tag?: number[];

    @Type(() => Number)
    @IsOptional()
    @IsNumber({}, { message: 'rating phải là số' })
    rating?: number;
}
