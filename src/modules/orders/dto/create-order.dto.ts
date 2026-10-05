import { IsUUID } from 'class-validator';

export class CreateOrderDto {
  @IsUUID()
  courseId!: string;
}
