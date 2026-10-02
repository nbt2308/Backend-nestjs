import { Module } from '@nestjs/common';
import { CourseValidationService } from './course-validation.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { YoutubeModule } from '@/youtube/youtube.module';
import { StorageModule } from '@/storage/storage.module';


@Module({
    imports: [PrismaModule, YoutubeModule, StorageModule],
    providers: [CourseValidationService],
    exports: [CourseValidationService],
})
export class CourseValidationModule { }
