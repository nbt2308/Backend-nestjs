export const PERMISSIONS = {
    // === SYSTEM & SETTINGS ===
    // Permission permissions
    PERMISSION_READ: 'permission.read',
    PERMISSION_CREATE: 'permission.create',
    PERMISSION_UPDATE: 'permission.update',
    PERMISSION_DELETE: 'permission.delete',

    // Audit Log permissions
    AUDIT_LOG_READ: 'audit_log.read',

    // Dashboard & Analytics permissions
    DASHBOARD_READ: 'dashboard.read',

    // === USER & ROLE MANAGEMENT ===
    // User permissions
    USER_READ: 'user.read',
    USER_CREATE: 'user.create',
    USER_UPDATE: 'user.update',
    USER_DELETE: 'user.delete',

    // Role permissions
    ROLE_READ: 'role.read',
    ROLE_CREATE: 'role.create',
    ROLE_UPDATE: 'role.update',
    ROLE_DELETE: 'role.delete',

    // === LEARNING MANAGEMENT SYSTEM (LMS) ===
    // Course permissions
    COURSE_READ: 'course.read',
    COURSE_CREATE: 'course.create',
    COURSE_UPDATE: 'course.update',
    COURSE_DELETE: 'course.delete',

    // Section permissions
    SECTION_READ: 'section.read',
    SECTION_CREATE: 'section.create',
    SECTION_UPDATE: 'section.update',
    SECTION_DELETE: 'section.delete',

    // Lesson permissions
    LESSON_READ: 'lesson.read',
    LESSON_CREATE: 'lesson.create',
    LESSON_UPDATE: 'lesson.update',
    LESSON_DELETE: 'lesson.delete',

    // Tag permissions
    TAG_READ: 'tag.read',
    TAG_CREATE: 'tag.create',
    TAG_UPDATE: 'tag.update',
    TAG_DELETE: 'tag.delete',

    // Enrollment permissions (Ghi danh học viên)
    ENROLLMENT_READ: 'enrollment.read',
    ENROLLMENT_CREATE: 'enrollment.create',
    ENROLLMENT_UPDATE: 'enrollment.update',
    ENROLLMENT_DELETE: 'enrollment.delete',

    // Wishlist permissions
    WISHLIST_READ: 'wishlist.read',
    WISHLIST_CREATE: 'wishlist.create',
    WISHLIST_DELETE: 'wishlist.delete',

    // === COMMERCE & TRANSACTIONS ===
    // Order permissions
    ORDER_READ: 'order.read',
    ORDER_CREATE: 'order.create',
    ORDER_UPDATE: 'order.update',
    ORDER_DELETE: 'order.delete',

    // === BLOG & CONTENT ===
    // Post permissions
    POST_READ: 'post.read',
    POST_CREATE: 'post.create',
    POST_UPDATE: 'post.update',
    POST_DELETE: 'post.delete',

    // === SOCIAL & FEEDBACK ===
    // Course Comment / Review permissions
    COURSE_COMMENT_READ: 'comment.read',
    COURSE_COMMENT_CREATE: 'comment.create',
    COURSE_COMMENT_UPDATE: 'comment.update',
    COURSE_COMMENT_DELETE: 'comment.delete',

    // Post Comment permissions
    POST_COMMENT_READ: 'post_comment.read',
    POST_COMMENT_CREATE: 'post_comment.create',
    POST_COMMENT_UPDATE: 'post_comment.update',
    POST_COMMENT_DELETE: 'post_comment.delete',

    // === MEDIA & FILE STORAGE ===
    // Media / File Upload permissions
    MEDIA_UPLOAD: 'media.upload',
    MEDIA_DELETE: 'media.delete',
} as const;

export type Permission =
    (typeof PERMISSIONS)[keyof typeof PERMISSIONS];