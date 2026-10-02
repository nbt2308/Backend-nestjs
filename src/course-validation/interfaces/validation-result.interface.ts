export interface ValidationError {
    code: string;
    message: string;
    sectionId?: number;
    sectionTitle?: string;
    lessonId?: number;
    lessonTitle?: string;
    resourceId?: number;
    resourceName?: string;
    /** Dữ liệu bổ sung (VD: currentDuration, videoId, publicId) */
    meta?: Record<string, any>;
}

export interface ValidationSummary {
    totalSections: number;
    totalLessons: number;
    // Tổng thời lượng video (giây)
    totalVideoDuration: number;
    totalPreviewLessons: number;
    totalResources: number;
    totalImages: number;
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    summary: ValidationSummary;
}

export interface CourseValidationResponse {
    course: {
        id: string;
        title: string;
        slug: string;
        status: string;
        instructorId: string;
        instructorName: string;
    };
    validation: ValidationResult;
}
