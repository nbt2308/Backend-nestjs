import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { YoutubeService } from '@/youtube/youtube.service';
import { StorageService } from '@/storage/storage.service';
import { MediaService } from '@/media/media.service';
import { extractPublicIdsFromHtml } from '@/media/media.utils';
import { CourseType, VideoUploadStatus } from '@prisma/client';
import {
    ValidationErrorCode,
    MIN_SECTIONS,
    MIN_LESSONS,
    MIN_VIDEO_DURATION_SECONDS,
    YOUTUBE_BATCH_SIZE,
    R2_CONCURRENCY,
} from './course-validation.constants';
import type {
    ValidationError,
    ValidationResult,
    ValidationSummary,
    CourseValidationResponse,
} from './interfaces/validation-result.interface';

/** Prisma course query type with all nested includes */
type CourseWithRelations = NonNullable<Awaited<ReturnType<CourseValidationService['fetchCourseData']>>>;

@Injectable()
export class CourseValidationService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly youtubeService: YoutubeService,
        private readonly storageService: StorageService,
        private readonly mediaService: MediaService,
    ) { }

    // ────────────────────────────────────────────
    //  PUBLIC API
    // ────────────────────────────────────────────

    /**
     * Chạy toàn bộ validation checks cho một course.
     * Trả về kết quả validation đầy đủ (collect-all pattern, không throw khi gặp lỗi).
     */
    async validateCourse(courseId: string): Promise<CourseValidationResponse> {
        const course = await this.fetchCourseData(courseId);

        if (!course) {
            throw new NotFoundException('Không tìm thấy khóa học');
        }

        const errors: ValidationError[] = [];

        // 1. Course metadata checks
        errors.push(...this.validateCourseMetadata(course));

        // 2. Pricing checks
        errors.push(...this.validatePricing(course));

        // Flatten sections → lessons
        const sections = course.sections ?? [];
        const allLessons = sections.flatMap((s) => s.lessons ?? []);

        // 3. Curriculum checks
        errors.push(...this.validateCurriculum(sections));

        // 4. Video checks (DB-based, synchronous)
        errors.push(...this.validateVideoStatuses(sections));

        // 5. YouTube existence checks (async, external)
        const youtubeErrors = await this.checkYouTubeVideosExist(allLessons);
        errors.push(...youtubeErrors);

        // 6. R2 resource checks (async, external)
        const r2Errors = await this.checkR2Resources(allLessons);
        errors.push(...r2Errors);

        // 7. Cloudinary image checks (async, external)
        const cloudinaryErrors = await this.checkCloudinaryImages(course, allLessons);
        errors.push(...cloudinaryErrors);

        // Build summary
        const summary = this.buildSummary(course, sections, allLessons);

        const validation: ValidationResult = {
            isValid: errors.length === 0,
            errors,
            summary,
        };

        return {
            course: {
                id: course.id,
                title: course.title,
                slug: course.slug,
                status: course.status,
                instructorId: course.instructorId,
                instructorName: course.instructor?.name ?? '',
            },
            validation,
        };
    }

    // ────────────────────────────────────────────
    //  LẤY DỮ LIỆU
    // ────────────────────────────────────────────

    private async fetchCourseData(courseId: string) {
        return this.prisma.course.findUnique({
            where: { id: courseId },
            include: {
                courseDescription: true,
                instructor: {
                    select: {
                        id: true,
                        name: true,
                        isActive: true,
                        status: true,
                    },
                },
                category: {
                    select: {
                        id: true,
                        status: true,
                    },
                },
                sections: {
                    where: { deletedAt: null },
                    orderBy: { order: 'asc' },
                    include: {
                        lessons: {
                            where: { deletedAt: null },
                            orderBy: { order: 'asc' },
                            include: {
                                resources: true,
                            },
                        },
                    },
                },
            },
        });
    }

    // ────────────────────────────────────────────
    //  GROUP 1: THÔNG TIN KHÓA HỌC
    // ────────────────────────────────────────────

    private validateCourseMetadata(course: CourseWithRelations): ValidationError[] {
        const errors: ValidationError[] = [];

        if (course.deletedAt) {
            errors.push({
                code: ValidationErrorCode.COURSE_DELETED,
                message: 'Khóa học đã bị xóa.',
            });
        }

        if (!course.title?.trim()) {
            errors.push({
                code: ValidationErrorCode.MISSING_TITLE,
                message: 'Khóa học phải có tiêu đề.',
            });
        }

        if (!course.slug?.trim()) {
            errors.push({
                code: ValidationErrorCode.MISSING_SLUG,
                message: 'Khóa học phải có slug.',
            });
        }

        if (!course.thumbnail?.trim()) {
            errors.push({
                code: ValidationErrorCode.MISSING_THUMBNAIL,
                message: 'Khóa học phải có ảnh thumbnail.',
            });
        }

        // CourseDescription checks
        const desc = course.courseDescription;
        if (!desc?.introduction?.trim()) {
            errors.push({
                code: ValidationErrorCode.MISSING_INTRODUCTION,
                message: 'Khóa học phải có phần giới thiệu.',
            });
        }

        if (!desc?.learningOutcomes?.trim()) {
            errors.push({
                code: ValidationErrorCode.MISSING_LEARNING_OUTCOMES,
                message: 'Khóa học phải có mục tiêu học tập.',
            });
        }

        if (!desc?.requirements?.trim()) {
            errors.push({
                code: ValidationErrorCode.MISSING_REQUIREMENTS,
                message: 'Khóa học phải có yêu cầu tiên quyết.',
            });
        }

        // CourseType & Level (enum — luôn có giá trị mặc định, nhưng phòng trường hợp bất thường)
        if (!course.courseType) {
            errors.push({
                code: ValidationErrorCode.MISSING_COURSE_TYPE,
                message: 'Khóa học phải có loại khóa học (FREE/PAID).',
            });
        }

        if (!course.level) {
            errors.push({
                code: ValidationErrorCode.MISSING_LEVEL,
                message: 'Khóa học phải có cấp độ.',
            });
        }

        // Instructor
        const instructor = course.instructor;
        if (!instructor || !instructor.isActive || !instructor.status) {
            errors.push({
                code: ValidationErrorCode.INVALID_INSTRUCTOR,
                message: 'Giảng viên không hợp lệ hoặc tài khoản đã bị vô hiệu hóa.',
            });
        }

        // Category
        if (!course.category?.status) {
            errors.push({
                code: ValidationErrorCode.CATEGORY_INACTIVE,
                message: 'Danh mục của khóa học không còn hoạt động.',
            });
        }

        return errors;
    }

    // ────────────────────────────────────────────
    //  GROUP 2: PRICING
    // ────────────────────────────────────────────

    private validatePricing(course: CourseWithRelations): ValidationError[] {
        const errors: ValidationError[] = [];
        const price = Number(course.price);
        const discount = Number(course.discount);

        if (course.courseType === CourseType.FREE && price > 0) {
            errors.push({
                code: ValidationErrorCode.FREE_COURSE_HAS_PRICE,
                message: 'Khóa học miễn phí phải có giá bằng 0.',
                meta: { currentPrice: price },
            });
        }

        if (course.courseType === CourseType.PAID && price <= 0) {
            errors.push({
                code: ValidationErrorCode.PAID_COURSE_NO_PRICE,
                message: 'Khóa học trả phí phải có giá lớn hơn 0.',
                meta: { currentPrice: price },
            });
        }

        if (discount > price) {
            errors.push({
                code: ValidationErrorCode.DISCOUNT_EXCEEDS_PRICE,
                message: 'Giá giảm không được lớn hơn giá gốc.',
                meta: { price, discount },
            });
        }

        return errors;
    }

    // ────────────────────────────────────────────
    //  GROUP 3: CẤU TRÚC BÀI GIẢNG
    // ────────────────────────────────────────────

    private validateCurriculum(
        sections: CourseWithRelations['sections'],
    ): ValidationError[] {
        const errors: ValidationError[] = [];

        // Ít nhất 1 section
        if (sections.length < MIN_SECTIONS) {
            errors.push({
                code: ValidationErrorCode.MIN_SECTION_COUNT,
                message: `Khóa học phải có ít nhất ${MIN_SECTIONS} chương.`,
                meta: { currentCount: sections.length, requiredCount: MIN_SECTIONS },
            });
        }

        // Tổng lesson >= 5
        const totalLessons = sections.reduce((sum, s) => sum + (s.lessons?.length ?? 0), 0);
        if (totalLessons < MIN_LESSONS) {
            errors.push({
                code: ValidationErrorCode.MIN_LESSON_COUNT,
                message: `Khóa học phải có ít nhất ${MIN_LESSONS} bài học.`,
                meta: { currentCount: totalLessons, requiredCount: MIN_LESSONS },
            });
        }

        for (const section of sections) {
            const lessons = section.lessons ?? [];

            // Mỗi section phải có ít nhất 1 lesson
            if (lessons.length === 0) {
                errors.push({
                    code: ValidationErrorCode.SECTION_EMPTY,
                    message: `Chương "${section.title}" phải có ít nhất 1 bài học.`,
                    sectionId: section.id,
                    sectionTitle: section.title,
                });
            }

            for (const lesson of lessons) {
                if (!lesson.title?.trim()) {
                    errors.push({
                        code: ValidationErrorCode.LESSON_MISSING_TITLE,
                        message: `Bài học trong chương "${section.title}" phải có tiêu đề.`,
                        lessonId: lesson.id,
                        sectionId: section.id,
                        sectionTitle: section.title,
                    });
                }
                //Có thể khôg cần content
                // if (!lesson.content?.trim()) {
                //     errors.push({
                //         code: ValidationErrorCode.LESSON_MISSING_CONTENT,
                //         message: `Bài học "${lesson.title}" phải có nội dung.`,
                //         lessonId: lesson.id,
                //         lessonTitle: lesson.title,
                //         sectionId: section.id,
                //         sectionTitle: section.title,
                //     });
                // }
            }
        }

        return errors;
    }

    // ────────────────────────────────────────────
    //  GROUP 4: TRẠNG THÁI VIDEO
    // ────────────────────────────────────────────

    private validateVideoStatuses(sections: CourseWithRelations['sections']): ValidationError[] {
        const errors: ValidationError[] = [];
        let totalDuration = 0;

        for (const section of sections) {
            for (const lesson of section.lessons ?? []) {
                const status = lesson.videoStatus;

                // Map status → error code
                //thêm partial tại vì videoStatus enum có READY nhưng READY không map thành lỗi được
                const statusErrorMap: Partial<Record<VideoUploadStatus, ValidationErrorCode>> = {
                    [VideoUploadStatus.PENDING]: ValidationErrorCode.VIDEO_PENDING,
                    [VideoUploadStatus.UPLOADING]: ValidationErrorCode.VIDEO_UPLOADING,
                    [VideoUploadStatus.PROCESSING]: ValidationErrorCode.VIDEO_PROCESSING,
                    [VideoUploadStatus.FAILED]: ValidationErrorCode.VIDEO_FAILED,
                };
                //check trạng thái video 
                const errorCode = statusErrorMap[status];
                if (errorCode) {
                    errors.push({
                        code: errorCode,
                        message: `Video của bài "${lesson.title}" đang ở trạng thái ${status}.`,
                        lessonId: lesson.id,
                        lessonTitle: lesson.title,
                        sectionId: section.id,
                        sectionTitle: section.title,
                        meta: { videoStatus: status },
                    });
                }

                // Nếu video READY nhưng thiếu videoId → cũng lỗi
                if (status === VideoUploadStatus.READY && !lesson.videoId) {
                    errors.push({
                        code: ValidationErrorCode.VIDEO_NOT_READY,
                        message: `Bài "${lesson.title}" có trạng thái READY nhưng thiếu videoId.`,
                        lessonId: lesson.id,
                        lessonTitle: lesson.title,
                        sectionId: section.id,
                        sectionTitle: section.title,
                    });
                }

                totalDuration += lesson.duration ?? 0;
            }
        }

        // Tổng duration phải >= 30 phút
        if (totalDuration < MIN_VIDEO_DURATION_SECONDS) {
            errors.push({
                code: ValidationErrorCode.VIDEO_DURATION_TOO_SHORT,
                message: `Tổng thời lượng video của toàn khóa học phải ít nhất 30 phút.`,
                meta: {
                    currentDuration: totalDuration,
                    requiredDuration: MIN_VIDEO_DURATION_SECONDS,
                    currentMinutes: Math.floor(totalDuration / 60),
                    requiredMinutes: MIN_VIDEO_DURATION_SECONDS / 60,
                },
            });
        }

        return errors;
    }

    // ────────────────────────────────────────────
    //  GROUP 5: KIỂM TRA VIDEO TỒN TẠI TRÊN YOUTUBE
    // ────────────────────────────────────────────

    private async checkYouTubeVideosExist(
        allLessons: CourseWithRelations['sections'][number]['lessons'],
    ): Promise<ValidationError[]> {
        const errors: ValidationError[] = [];

        // Chỉ check những lesson có videoId và status READY
        const lessonsWithVideo = allLessons.filter(
            (l) => l.videoId && l.videoStatus === VideoUploadStatus.READY,
        );

        if (lessonsWithVideo.length === 0) return errors;

        // Build map: videoId → lesson info (để khi tìm thấy missing có thể truy ngược)
        // Mục đích của việc map videoId thành danh sách các bài học là để khi có lỗi thì có thể truy ngược lại bài học nào và lấy ra được mảng bài học duy nhất
        const videoIdToLessons = new Map<string, typeof lessonsWithVideo>();
        for (const lesson of lessonsWithVideo) {
            const vid = lesson.videoId!; // !: non-null (có nghĩa là video này chắc chắn không null)
            if (!videoIdToLessons.has(vid)) { // kiểm tra có tồn tại video trong map không
                videoIdToLessons.set(vid, []); // nếu không thì thêm vào
            }
            videoIdToLessons.get(vid)!.push(lesson); // thêm bài học vào map
        }

        const uniqueVideoIds = [...videoIdToLessons.keys()];

        // Batch check — YouTube API cho phép tối đa 50 ids/request
        for (let i = 0; i < uniqueVideoIds.length; i += YOUTUBE_BATCH_SIZE) {
            //cắt mảng thành 50 vidId 1 lần gọi (ví dụ: 100 video thì 0->49, 50->99)
            const batch = uniqueVideoIds.slice(i, i + YOUTUBE_BATCH_SIZE);

            try {
                const existingIds = await this.youtubeService.checkVideosExist(batch);
                //loop qua toàn bộ batch để kiểm tra videoId có tồn tại không và không loop existingIds vì có thể sẽ bỏ sót 
                for (const videoId of batch) {
                    if (!existingIds.get(videoId)) {
                        // Video không tồn tại → tạo error cho tất cả lesson dùng videoId này
                        const affectedLessons = videoIdToLessons.get(videoId) ?? [];
                        for (const lesson of affectedLessons) {
                            errors.push({
                                code: ValidationErrorCode.YOUTUBE_VIDEO_NOT_FOUND,
                                message: `Video của bài "${lesson.title}" không còn tồn tại trên YouTube.`,
                                lessonId: lesson.id,
                                lessonTitle: lesson.title,
                                meta: { videoId },
                            });
                        }
                    }
                }
            } catch {
                errors.push({
                    code: ValidationErrorCode.EXTERNAL_CHECK_FAILED,
                    message: 'Không thể kiểm tra video YouTube. Vui lòng thử lại sau.',
                    meta: { service: 'youtube', batchIndex: i },
                });
            }
        }

        return errors;
    }

    // ────────────────────────────────────────────
    //  GROUP 6: R2 RESOURCE CHECK
    // ────────────────────────────────────────────

    private async checkR2Resources(allLessons: CourseWithRelations['sections'][number]['lessons'],): Promise<ValidationError[]> {
        const errors: ValidationError[] = [];

        // Gom tất cả resources của tất cả các lesson thành 1 obj 
        const resources = allLessons.flatMap((lesson) =>
            (lesson.resources ?? []).map((r) => ({
                id: r.id,
                name: r.name,
                key: r.key,
                lessonId: lesson.id,
                lessonTitle: lesson.title,
            })),
        );

        if (resources.length === 0) return errors;

        // Check song song với giới hạn concurrency
        for (let i = 0; i < resources.length; i += R2_CONCURRENCY) {
            const batch = resources.slice(i, i + R2_CONCURRENCY);
            //chạy song song với giới hạn concurrency (ví dụ có 10 resources 1 lần nếu xài await mà không promise allsettled thì sẽ thành tuần tự)
            //không dùng promise all vì nếu có 1 resource nào đó bị lỗi thì promise all sẽ reject toàn bộ
            //promise allsettled luôn trả về dù thành công hay thất bại
            const results = await Promise.allSettled(
                batch.map((r) => this.storageService.headObject(r.key)),
            );

            results.forEach((result, index) => {
                const resource = batch[index];
                const exists = result.status === 'fulfilled' && result.value === true;

                if (!exists) {
                    errors.push({
                        code: ValidationErrorCode.RESOURCE_NOT_FOUND_R2,
                        message: `Tài nguyên "${resource.name}" không tồn tại trên cloud storage.`,
                        lessonId: resource.lessonId,
                        lessonTitle: resource.lessonTitle,
                        resourceId: resource.id,
                        resourceName: resource.name,
                        meta: { key: resource.key },
                    });
                }
            });
        }

        return errors;
    }

    // ────────────────────────────────────────────
    //  GROUP 7: CLOUDINARY IMAGE CHECK
    // ────────────────────────────────────────────

    private async checkCloudinaryImages(
        course: CourseWithRelations,
        allLessons: CourseWithRelations['sections'][number]['lessons'],
    ): Promise<ValidationError[]> {
        const errors: ValidationError[] = [];

        // 1. Check course thumbnail
        if (course.thumbnail_publicID?.trim()) {
            try {
                const exists = await this.mediaService.checkImageExists(course.thumbnail_publicID);
                if (!exists) {
                    errors.push({
                        code: ValidationErrorCode.THUMBNAIL_NOT_FOUND,
                        message: 'Ảnh thumbnail của khóa học không tồn tại trên Cloudinary.',
                        meta: { publicId: course.thumbnail_publicID },
                    });
                }
            } catch {
                errors.push({
                    code: ValidationErrorCode.EXTERNAL_CHECK_FAILED,
                    message: 'Không thể kiểm tra thumbnail trên Cloudinary. Vui lòng thử lại sau.',
                    meta: { service: 'cloudinary', target: 'thumbnail' },
                });
            }
        }

        // 2. Check images referenced in lesson content
        const allPublicIds: Array<{ publicId: string; lessonId: number; lessonTitle: string }> = [];

        for (const lesson of allLessons) {
            if (!lesson.content) continue;
            //lấy tất cả các publicId của ảnh có trong content của lesson
            const publicIds = extractPublicIdsFromHtml(lesson.content);
            for (const publicId of publicIds) {
                allPublicIds.push({
                    publicId,
                    lessonId: lesson.id,
                    lessonTitle: lesson.title,
                });
            }
        }

        if (allPublicIds.length === 0) return errors;

        // Batch check — gom tất cả publicIds unique
        const uniquePublicIds = [...new Set(allPublicIds.map((p) => p.publicId))];

        try {
            const existingIds = await this.mediaService.checkImagesExist(uniquePublicIds);

            for (const entry of allPublicIds) {
                if (!existingIds.has(entry.publicId)) {
                    errors.push({
                        code: ValidationErrorCode.LESSON_IMAGE_NOT_FOUND,
                        message: `Ảnh trong nội dung bài "${entry.lessonTitle}" không tồn tại trên Cloudinary.`,
                        lessonId: entry.lessonId,
                        lessonTitle: entry.lessonTitle,
                        meta: { publicId: entry.publicId },
                    });
                }
            }
        } catch {
            errors.push({
                code: ValidationErrorCode.EXTERNAL_CHECK_FAILED,
                message: 'Không thể kiểm tra ảnh trên Cloudinary. Vui lòng thử lại sau.',
                meta: { service: 'cloudinary', target: 'lesson_images' },
            });
        }

        return errors;
    }

    // ────────────────────────────────────────────
    //  Kết quả mong muốn
    // ────────────────────────────────────────────

    private buildSummary(
        course: CourseWithRelations,
        sections: CourseWithRelations['sections'],
        allLessons: CourseWithRelations['sections'][number]['lessons'],
    ): ValidationSummary {
        const totalDuration = allLessons.reduce((sum, l) => sum + (l.duration ?? 0), 0);
        const totalResources = allLessons.reduce((sum, l) => sum + (l.resources?.length ?? 0), 0);

        // Đếm tổng ảnh trong lesson content
        let totalImages = 0;
        for (const lesson of allLessons) {
            if (lesson.content) {
                totalImages += extractPublicIdsFromHtml(lesson.content).length;
            }
        }

        return {
            totalSections: sections.length,
            totalLessons: allLessons.length,
            totalVideoDuration: totalDuration,
            totalPreviewLessons: allLessons.filter((l) => l.isPreview).length,
            totalResources,
            totalImages,
        };
    }
}
