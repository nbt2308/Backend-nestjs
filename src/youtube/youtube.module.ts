import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { YoutubeService } from './youtube.service';
import { YoutubeController } from './youtube.controller';
import { BullModule } from '@nestjs/bullmq';

@Module({
    imports: [
        ConfigModule,
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
            name: 'youtube-upload',
        }),
    ],
    controllers: [YoutubeController],
    providers: [YoutubeService],
    exports: [YoutubeService],
})
export class YoutubeModule { }