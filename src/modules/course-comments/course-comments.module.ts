import { Module } from '@nestjs/common';
import { CourseCommentsService } from './course-comments.service';
import { CourseCommentsController } from './course-comments.controller';

@Module({
  controllers: [CourseCommentsController],
  providers: [CourseCommentsService],
})
export class CourseCommentsModule {}
