import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CleanupService } from './cleanup.service';
import { CleanupProcessor } from './cleanup.processor';
import { PrismaModule } from '@/prisma/prisma.module';
import { YoutubeModule } from '@/youtube/youtube.module';
import { StorageModule } from '@/storage/storage.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'media-cleanup',
    }),
    PrismaModule,
    YoutubeModule,
    StorageModule,
  ],
  providers: [CleanupService, CleanupProcessor],
  exports: [CleanupService],
})
export class CleanupModule {}
