import { Module } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthorizationModule } from '@/authorization/authorization.module';
import { CleanupModule } from '@/cleanup/cleanup.module';
import { CourseValidationModule } from '@/course-validation/course-validation.module';

@Module({
  imports: [PrismaModule, AuthorizationModule, CleanupModule, CourseValidationModule],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService]
})
export class CoursesModule { }
