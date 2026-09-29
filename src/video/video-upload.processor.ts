import { YoutubeService } from '@/youtube/youtube.service';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { VideoUploadService } from './video-upload.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Processor('video-upload', { concurrency: 1 })
export class VideoUploadProcessor extends WorkerHost {
    constructor(
        private readonly youtubeService: YoutubeService,
        private readonly videoUploadService: VideoUploadService,
        private readonly prisma: PrismaService,
        private configService: ConfigService,
    ) { super(); }
    async process(job: Job): Promise<any> {
        const now = new Date().toISOString();
        console.log(`[${now}] 📥 Nhận job:`, job.id);
        console.log(`[${now}] 📦 Job name:`, job.name);
        console.log(`[${now}] 📄 Job data:`, job.data);

        switch (job.name) {
            case 'upload-video':
                return this.handleUploadVideo(job);
            case 'check-video-processing':
                return this.handleCheckVideoProcessing(job);
            case 'cleanup-old-video':
                return this.handleCleanupOldVideo(job);
            default:
                throw new Error(`Unknown job: ${job.name}`);
        }
    }

    private async handleUploadVideo(job: Job) {
        const { lessonId, filePath, title, description } = job.data;
        console.log('🎬 Đang xử lý video...');
        const result = await this.youtubeService.processVideoUpload({
            lessonId,
            filePath,
            title,
            description,
        });
        if (result.status === 'PROCESSING' && result.videoId) {
            //thêm job kiểm tra trạng thái xử lý của video sau 10s
            await this.videoUploadService.addCheckProcessingJob(
                result.lessonId,
                result.videoId,
                10_000
            );
        }
        //khi status = LESSON_DELETED thì không add job
        return result;
    }

    private async handleCheckVideoProcessing(job: Job) {
        const { lessonId, videoId } = job.data;

        //check process job còn hạn để retry polling không
        const lesson = await this.prisma.lesson.findUnique({
            where: { id: lessonId },
            select: {
                videoId: true,
                videoStatus: true,
                processingStartedAt: true,
            },
        });
        //Nếu lesson không tồn tại hoặc videoStatus không phải PROCESSING hoặc videoId không tồn tại thì dừng
        if (!lesson || lesson.videoStatus !== 'PROCESSING' || !lesson.videoId) {
            return;
        }

        if (!lesson.processingStartedAt) {
            await this.prisma.lesson.update({
                where: { id: lessonId },
                data: {
                    videoId: null,
                    oldVideoId: videoId,
                    videoStatus: 'FAILED',
                    videoError: "Không xác định được thời điểm bắt đầu xử lý video",
                    processingStartedAt: null
                },
            });
            return;
        }

        const processingTimeout = this.configService.get<number>('YOUTUBE_PROCESSING_TIMEOUT') ?? 30 * 60 * 1000;
        //tính thời gian elapsed
        const elapsedTime = Date.now() - lesson.processingStartedAt.getTime();

        if (elapsedTime >= processingTimeout) {
            //tránh bớt trường hợp race condition có 1 thg chen vô upload video mới
            const result = await this.prisma.lesson.updateMany({
                where: {
                    id: lessonId,
                    videoId,
                    videoStatus: 'PROCESSING',
                },
                data: {
                    videoId: null,
                    oldVideoId: videoId,
                    videoStatus: 'FAILED',
                    videoError: 'YouTube xử lý video quá thời gian cho phép',
                    processingStartedAt: null,
                },
            });

            //dù count === 0 (race condition) hay count > 0 (đã update FAILED) đều dừng polling
            return;
        }
        //check trạng thái xử lý video của youtube
        const result = await this.youtubeService.checkVideoProcessing(videoId);

        //Success
        if (result.status === 'succeeded') {
            //lấy duration thật của video sau khi YouTube xử lý xong
            const duration = await this.youtubeService.getVideoDuration(videoId);

            //tìm lesson vừa update
            const lesson = await this.prisma.lesson.findUnique({
                where: { id: lessonId },
                select: {
                    oldVideoId: true,
                },
            });
            await this.prisma.lesson.update({
                where: { id: lessonId },
                data: {
                    videoStatus: 'READY',
                    videoError: null,
                    duration,
                    processingStartedAt: null,
                },
            });

            //xóa video cũ trên youtube sau khi update video mới thành công khi update lesson
            if (lesson?.oldVideoId) {
                try {
                    console.log(`Đang xóa video cũ ${lesson.oldVideoId} của lesson ${lessonId}`);
                    //xóa video trên youtube
                    await this.youtubeService.deleteVideo(lesson.oldVideoId);
                    //cập nhật lại oldVideoId thành null
                    await this.prisma.lesson.update({
                        where: { id: lessonId },
                        data: {
                            oldVideoId: null,
                        },
                    });


                } catch (error) {
                    console.log(`Không thể xóa video cũ: ${error}`);

                    //add job retry cleanup old video sau 30s
                    await this.videoUploadService.addCleanupOldVideoJob(lessonId, lesson.oldVideoId);
                }
            }

            console.log(`✅ Lesson ${lessonId} READY`);

            return;
        }

        //Failed
        if (result.status === 'failed') {
            await this.prisma.lesson.update({
                where: { id: lessonId },
                data: {
                    videoStatus: 'FAILED',
                    videoError: result.error,
                    processingStartedAt: null,
                },
            });

            console.log(`❌ Lesson ${lessonId} FAILED`);

            return;
        }

        //retry
        const checkInterval =
            this.configService.get<number>(
                'YOUTUBE_PROCESSING_CHECK_INTERVAL',
            ) ?? 10_000;
        await this.videoUploadService.addCheckProcessingJob(
            lessonId,
            videoId,
            checkInterval,
        );
        console.log(`⏳ Lesson ${lessonId} vẫn đang PROCESSING`,);

    }


    //hanler job cleanup old video khi delete video error
    private async handleCleanupOldVideo(job: Job) {
        const { lessonId, videoId } = job.data;

        const lesson = await this.prisma.lesson.findUnique({
            where: { id: lessonId },
            select: {
                id: true,
                oldVideoId: true,
            },
        });

        if (!lesson) {
            // Lesson không còn tồn tại.
            // Vẫn thử xóa video vì đây chính là video cần cleanup.
            await this.youtubeService.deleteVideo(videoId);
            return;
        }

        // Video này đã được cleanup hoặc oldVideoId đã thay đổi.
        if (lesson.oldVideoId !== videoId) {
            return;
        }

        await this.youtubeService.deleteVideo(videoId);

        await this.prisma.lesson.update({
            where: { id: lessonId },
            data: {
                oldVideoId: null,
            },
        });
    }
}