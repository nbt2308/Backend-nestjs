import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class CleanupService {
    constructor(
        @InjectQueue('media-cleanup') private readonly cleanupQueue: Queue,
    ) {}

    async addCourseCleanupJob(courseId: string) {
        await this.cleanupQueue.add('cleanup-course-media', { courseId }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 30000 },
            removeOnComplete: true,
            removeOnFail: false,
        });
    }

    async addSectionCleanupJob(sectionId: number) {
        await this.cleanupQueue.add('cleanup-section-media', { sectionId }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 30000 },
            removeOnComplete: true,
            removeOnFail: false,
        });
    }

    async addLessonCleanupJob(lessonId: number) {
        await this.cleanupQueue.add('cleanup-lesson-media', { lessonId }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 30000 },
            removeOnComplete: true,
            removeOnFail: false,
        });
    }

    /**
     * Xóa ảnh Cloudinary theo `public_id`.
     * Job mang sẵn danh sách id nên chạy được cả khi row DB đã bị xóa cứng.
     */
    async addCloudinaryCleanupJob(publicIds: string[]) {
        if (!publicIds || publicIds.length === 0) return;

        await this.cleanupQueue.add('cleanup-cloudinary-images', { publicIds }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 30000 },
            removeOnComplete: true,
            removeOnFail: false,
        });
    }
}
