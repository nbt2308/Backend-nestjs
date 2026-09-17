import { Module } from '@nestjs/common';
import { CourseReviewsService } from './course-reviews.service';
import { CourseReviewsController } from './course-reviews.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthorizationModule } from '@/authorization/authorization.module';

@Module({
  imports: [PrismaModule, AuthorizationModule],
  controllers: [CourseReviewsController],
  providers: [CourseReviewsService],
  exports: [CourseReviewsService],
})
export class CourseReviewsModule { }
