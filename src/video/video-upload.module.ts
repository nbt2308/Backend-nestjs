import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VideoUploadProcessor } from './video-upload.processor';
import { VideoUploadService } from './video-upload.service';
import { VideoUploadController } from './video-upload.controller';
import { YoutubeModule } from '@/youtube/youtube.module';
import { PrismaModule } from '@/prisma/prisma.module';
@Module({
  imports: [
          ConfigModule,
          YoutubeModule,
          PrismaModule,
          BullModule.forRootAsync({
              imports: [ConfigModule],
              inject: [ConfigService],
              useFactory: (configService: ConfigService) => ({
                  connection: {
                      host: configService.get<string>('REDIS_HOST'),
                      port: Number(configService.get<string>('REDIS_PORT')),
                  },
              }),
          }),
          BullModule.registerQueue({
              name: 'video-upload',
          }),
      ],
      controllers: [VideoUploadController],
      providers: [VideoUploadProcessor, VideoUploadService],
      exports: [VideoUploadService],
})
export class VideoUploadModule {}