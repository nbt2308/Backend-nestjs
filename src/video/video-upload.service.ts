
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

@Injectable()
export class VideoUploadService {
    constructor(@InjectQueue('video-upload') private videoUploadQueue: Queue) { }

    async addUploadJob(data: { lessonId: number; filePath: string; title: string; description?: string; }) {
        const job = await this.videoUploadQueue.add(
            'upload-video',
            data,
            {
                attempts: 1, //thử lại tối đa 1 lần
                removeOnComplete: true, // tự động xóa job khi hoàn thành
                removeOnFail: false, // không tự động xóa job khi thất bại
            },
        );

        return job;
    }
    //service check video đã upload lên youtube xong chưa -> cơ chế check mỗi 10s
    async addCheckProcessingJob(lessonId: number, videoId: string, delay = 10_000,) {
        //đưa vào queue để xử lý trong khoảng delay(10s)
        return this.videoUploadQueue.add(
            'check-video-processing',
            {
                lessonId,
                videoId,
            },
            {
                delay,
                removeOnComplete: true,
                removeOnFail: false,
            },
        );
    }

    //job cleanup-old-video to retry delete old video when error
    async addCleanupOldVideoJob(lessonId: number, videoId: string, delay = 30_000,) {
        return this.videoUploadQueue.add(
            'cleanup-old-video',
            {
                lessonId,
                videoId,
            },
            {
                delay,
                attempts: 5,
                backoff: {
                    type: 'exponential',
                    delay: 10_000, // 10s, 20s, 40s, 80s, 160s
                },
                removeOnComplete: true,
                removeOnFail: false,
            },
        );
    }

}
