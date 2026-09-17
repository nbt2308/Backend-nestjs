import { Module } from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { LessonsController } from './lessons.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { YoutubeModule } from '@/youtube/youtube.module';
import { AuthorizationModule } from '@/authorization/authorization.module';
import { StorageModule } from '@/storage/storage.module';
import { LessonAccessService } from './lessons-access.service';


@Module({
  imports: [PrismaModule, YoutubeModule, AuthorizationModule,StorageModule],
  controllers: [LessonsController],
  providers: [LessonsService, LessonAccessService],
  exports: [LessonsService, LessonAccessService,]
})
export class LessonsModule { }
