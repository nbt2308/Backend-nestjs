
import { IsNotEmpty, IsString, IsEnum } from 'class-validator';

// Định nghĩa sẵn các enum để strict type và validate
export enum InteractionTargetType {
  COURSE = 'COURSE',
  COURSE_REVIEW = 'COURSE_REVIEW',
  POST = 'POST',
  POST_COMMENT = 'POST_COMMENT',
}

export enum ActionType {
  LIKE = 'LIKE',
  DISLIKE = 'DISLIKE',
}

export class CreateInteractionDto {
  @IsNotEmpty({ message: "TargetId không được để trống" })
  @IsString({ message: "TargetId phải là string" })
  targetId!: string;

  @IsNotEmpty({ message: "TargetType không được để trống" })
  @IsEnum(InteractionTargetType, { message: "TargetType không hợp lệ" })
  targetType!: InteractionTargetType;

  @IsNotEmpty({ message: "ActionType không được để trống" })
  @IsEnum(ActionType, { message: "ActionType không hợp lệ" })
  actionType!: ActionType;
}
