import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '@/prisma/prisma.service';
import { YoutubeService } from '@/youtube/youtube.service';
import { StorageService } from '@/storage/storage.service';
import { MediaService } from '@/media/media.service';
import { extractPublicIdsFromHtml } from '@/media/media.utils';
import { CleanupService } from '@/cleanup/cleanup.service';
import { VideoUploadStatus } from '@prisma/client';

@Processor('media-cleanup')
export class CleanupProcessor extends WorkerHost {
    private readonly logger = new Logger(CleanupProcessor.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly youtubeService: YoutubeService,
        private readonly storageService: StorageService,
        private readonly mediaService: MediaService,
        private readonly cleanupService: CleanupService,
    ) {
        super();
    }

    async process(job: Job<any, any, string>): Promise<any> {
        const { name, data } = job;
        
        switch (name) {
            case 'cleanup-course-media':
                await this.handleCleanupCourse(data.courseId);
                break;
            case 'cleanup-section-media':
                await this.handleCleanupSection(data.sectionId);
                break;
            case 'cleanup-lesson-media':
                await this.handleCleanupLesson(data.lessonId);
                break;
            case 'cleanup-cloudinary-images':
                await this.handleCleanupCloudinaryImages(data.publicIds);
                break;
            default:
                this.logger.warn(`Job name ${name} is not handled`);
        }
    }

    /**
     * Xóa ảnh Cloudinary theo danh sách `public_id`.
     * Từng ảnh độc lập: một ảnh lỗi không được làm hỏng cả batch.
     */
    private async handleCleanupCloudinaryImages(publicIds: unknown) {
        if (!Array.isArray(publicIds) || publicIds.length === 0) {
            this.logger.warn('cleanup-cloudinary-images called without publicIds, skipping');
            return;
        }

        for (const publicId of publicIds as string[]) {
            try {
                await this.mediaService.deleteImage(publicId);
                this.logger.log(`Deleted Cloudinary image ${publicId}`);
            } catch (err: any) {
                // 404 nghĩa là ảnh đã bị xóa trước đó -> coi như hoàn tất, không retry
                if (err?.http_code === 404) {
                    this.logger.warn(`Cloudinary image ${publicId} not found, skipping`);
                    continue;
                }
                this.logger.error(`Failed to delete Cloudinary image ${publicId}: ${err?.message}`);
                throw err; // throw để retry job
            }
        }
    }

    /**
     * Thu ảnh content của lesson rồi đẩy job xóa ảnh Cloudinary.
     * Không clear `content` để dữ liệu còn truy vết được.
     */
    private async enqueueLessonContentImages(lessonId: number, content: string | null) {
        const publicIds = extractPublicIdsFromHtml(content);
        if (publicIds.length > 0) {
            await this.cleanupService.addCloudinaryCleanupJob(publicIds);
            this.logger.log(`Queued ${publicIds.length} Cloudinary image(s) from lesson ${lessonId}`);
        }
    }

    private async handleCleanupCourse(courseId: string) {
        this.logger.log(`Starting media cleanup for course ${courseId}`);

        // Thumbnail thuộc về course -> dọn ở đây, KHÔNG dọn trong handleCleanupSection
        // (nếu không sẽ xóa nhầm thumbnail mỗi lần duyệt qua từng section).
        const course = await this.prisma.course.findUnique({
            where: { id: courseId },
            select: { thumbnail_publicID: true },
        });
        if (course?.thumbnail_publicID) {
            await this.cleanupService.addCloudinaryCleanupJob([course.thumbnail_publicID]);
        }

        const sections = await this.prisma.section.findMany({
            where: { courseId },
            select: { id: true },
        });

        for (const section of sections) {
            await this.handleCleanupSection(section.id);
        }
        this.logger.log(`Completed media cleanup for course ${courseId}`);
    }

    private async handleCleanupSection(sectionId: number) {
        this.logger.log(`Starting media cleanup for section ${sectionId}`);
        const lessons = await this.prisma.lesson.findMany({
            where: { sectionId },
            select: { id: true },
        });

        for (const lesson of lessons) {
            await this.handleCleanupLesson(lesson.id);
        }
        this.logger.log(`Completed media cleanup for section ${sectionId}`);
    }

    private async handleCleanupLesson(lessonId: number) {
        this.logger.log(`Starting media cleanup for lesson ${lessonId}`);
        
        const lesson = await this.prisma.lesson.findUnique({
            where: { id: lessonId },
            include: { resources: true, section: { select: { courseId: true, course: true } } },
        });

        if (!lesson || !lesson.section?.courseId) {
            this.logger.warn(`Lesson ${lessonId} not found or section relation missing, skipping cleanup`);
            return;
        }

        // Thu ảnh Cloudinary từ nội dung lesson trước khi xóa.
        // Giữ nguyên `content` để dữ liệu còn truy vết được (hành vi khớp với việc
        // chỉ set videoId/null thay vì clear content khi xóa video).
        if (lesson.content) {
            await this.enqueueLessonContentImages(lesson.id, lesson.content);
        }

        // Delete videos from YouTube
        if (lesson.videoId) {
            try {
                await this.youtubeService.deleteVideo(lesson.videoId);
                this.logger.log(`Deleted YouTube video ${lesson.videoId} for lesson ${lessonId}`);
            } catch (err: any) {
                // Ignore 404 (already deleted)
                if (err?.response?.status !== 404) {
                    this.logger.error(`Failed to delete YouTube video ${lesson.videoId}: ${err.message}`);
                    throw err; // throw to retry job
                }
            }
        }

        if (lesson.oldVideoId) {
            try {
                await this.youtubeService.deleteVideo(lesson.oldVideoId);
                this.logger.log(`Deleted old YouTube video ${lesson.oldVideoId} for lesson ${lessonId}`);
            } catch (err: any) {
                if (err?.response?.status !== 404) {
                    this.logger.error(`Failed to delete old YouTube video ${lesson.oldVideoId}: ${err.message}`);
                    throw err;
                }
            }
        }

        // Delete resources from Storage (R2)
        if (lesson.resources && lesson.resources.length > 0) {
            for (const resource of lesson.resources) {
                try {
                    await this.storageService.deleteFile(resource.key);
                    this.logger.log(`Deleted storage file ${resource.key} for lesson ${lessonId}`);
                } catch (err: any) {
                    this.logger.error(`Failed to delete storage file ${resource.key}: ${err.message}`);
                    throw err;
                }
            }
        }

        // Update DB
        await this.prisma.$transaction(async (tx) => {
            if (lesson.resources && lesson.resources.length > 0) {
                await tx.lessonResource.deleteMany({
                    where: { lessonId: lessonId },
                });
            }
            
            await tx.lesson.update({
                where: { id: lessonId },
                data: {
                    videoId: null,
                    oldVideoId: null,
                    videoStatus: VideoUploadStatus.DELETED,
                },
            });
        });

        this.logger.log(`Completed media cleanup for lesson ${lessonId}`);
    }
}
