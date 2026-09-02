import { Module } from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { LessonsController } from './lessons.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { YoutubeModule } from '@/youtube/youtube.module';
import { AuthorizationModule } from '@/authorization/authorization.module';


@Module({
  imports: [PrismaModule, YoutubeModule, AuthorizationModule],
  controllers: [LessonsController],
  providers: [LessonsService],
  exports: [LessonsService]
})
export class LessonsModule { }
