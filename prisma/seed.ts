import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PERMISSIONS } from '../src/authorization/constants/permission';

import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});


// ============================================================
// ROLES
// ============================================================

const ROLES = {
    ADMIN: 'ADMIN',
    INSTRUCTOR: 'INSTRUCTOR',
    STUDENT: 'STUDENT',
} as const;


// ============================================================
// ROLE PERMISSIONS
// ============================================================

const ADMIN_PERMISSIONS = Object.values(PERMISSIONS);

const INSTRUCTOR_PERMISSIONS = [
    // Course
    PERMISSIONS.COURSE_READ,
    PERMISSIONS.COURSE_CREATE,
    PERMISSIONS.COURSE_UPDATE,
    PERMISSIONS.COURSE_DELETE,
    PERMISSIONS.COURSE_SUBMIT,
    PERMISSIONS.COURSE_UNPUBLISH,

    // Section
    PERMISSIONS.SECTION_READ,
    PERMISSIONS.SECTION_CREATE,
    PERMISSIONS.SECTION_UPDATE,
    PERMISSIONS.SECTION_DELETE,

    // Lesson
    PERMISSIONS.LESSON_READ,
    PERMISSIONS.LESSON_CREATE,
    PERMISSIONS.LESSON_UPDATE,
    PERMISSIONS.LESSON_DELETE,

    // Tag
    PERMISSIONS.TAG_READ,
    
    // Category
    PERMISSIONS.CATEGORY_READ,

    // Enrollment
    PERMISSIONS.ENROLLMENT_READ,

    // Wishlist
    PERMISSIONS.WISHLIST_READ,

    // Post
    PERMISSIONS.POST_READ,
    PERMISSIONS.POST_CREATE,
    PERMISSIONS.POST_UPDATE,
    PERMISSIONS.POST_DELETE,

    // Course Review
    PERMISSIONS.COURSE_REVIEW_READ,
    PERMISSIONS.COURSE_REVIEW_CREATE,
    PERMISSIONS.COURSE_REVIEW_UPDATE,
    PERMISSIONS.COURSE_REVIEW_DELETE,

    // Post Comment
    PERMISSIONS.POST_COMMENT_READ,
    PERMISSIONS.POST_COMMENT_CREATE,
    PERMISSIONS.POST_COMMENT_UPDATE,
    PERMISSIONS.POST_COMMENT_DELETE,

    // Media
    PERMISSIONS.MEDIA_UPLOAD,
    PERMISSIONS.MEDIA_DELETE,
    PERMISSIONS.LESSON_RESOURCE_CREATE,
    PERMISSIONS.LESSON_RESOURCE_DELETE,
];

const STUDENT_PERMISSIONS = [
    // Course
    PERMISSIONS.COURSE_READ,

    // Section
    PERMISSIONS.SECTION_READ,

    // Lesson
    PERMISSIONS.LESSON_READ,

    // Tag
    PERMISSIONS.TAG_READ,

    // Category
    PERMISSIONS.CATEGORY_READ,

    // Enrollment
    PERMISSIONS.ENROLLMENT_READ,
    PERMISSIONS.ENROLLMENT_CREATE,
    PERMISSIONS.ENROLLMENT_UPDATE,
    PERMISSIONS.ENROLLMENT_DELETE,

    // Wishlist
    PERMISSIONS.WISHLIST_READ,
    PERMISSIONS.WISHLIST_CREATE,
    PERMISSIONS.WISHLIST_DELETE,

    // Post
    PERMISSIONS.POST_READ,

    // Course Review
    PERMISSIONS.COURSE_REVIEW_READ,
    PERMISSIONS.COURSE_REVIEW_CREATE,
    PERMISSIONS.COURSE_REVIEW_UPDATE,
    PERMISSIONS.COURSE_REVIEW_DELETE,

    // Post Comment
    PERMISSIONS.POST_COMMENT_READ,
    PERMISSIONS.POST_COMMENT_CREATE,
    PERMISSIONS.POST_COMMENT_UPDATE,
    PERMISSIONS.POST_COMMENT_DELETE,

    // Interaction
    PERMISSIONS.INTERACTION_REACT,
];


// ============================================================
// ROLE DEFINITIONS
// ============================================================

const roleDefinitions = [
    {
        name: ROLES.ADMIN,
        permissions: ADMIN_PERMISSIONS,
    },
    {
        name: ROLES.INSTRUCTOR,
        permissions: INSTRUCTOR_PERMISSIONS,
    },
    {
        name: ROLES.STUDENT,
        permissions: STUDENT_PERMISSIONS,
    },
];


// ============================================================
// SEED USERS
// ============================================================

const seedUsers = [
    {
        name: 'System Administrator',
        email: 'admin@example.com',
        password: 'Admin@123456',
        role: ROLES.ADMIN,
    },
    {
        name: 'Demo Instructor',
        email: 'instructor@example.com',
        password: 'Instructor@123456',
        role: ROLES.INSTRUCTOR,
    },
    {
        name: 'Demo User',
        email: 'user@example.com',
        password: 'User@123456',
        role: ROLES.STUDENT,
    },
];


// ============================================================
// SEED CATEGORIES
// ============================================================

const seedCategories = [
    { id: 1, name: 'Lập trình Web', slug: 'lap-trinh-web', description: 'Các khóa học về lập trình Web', parentId: null },
    { id: 2, name: 'Frontend', slug: 'frontend', description: 'Lập trình giao diện Frontend', parentId: 1 },
    { id: 3, name: 'Backend', slug: 'backend', description: 'Lập trình hệ thống Backend', parentId: 1 },
    { id: 4, name: 'Trí tuệ nhân tạo', slug: 'tri-tue-nhan-tao', description: 'AI & Machine Learning', parentId: null },
];


// ============================================================
// MAIN
// ============================================================

async function main() {
    console.log('========================================');
    console.log('🌱 Starting database seed...');
    console.log('========================================');


    // ========================================================
    // 1. CREATE PERMISSIONS
    // ========================================================

    console.log('\n📌 Seeding permissions...');

    const permissionMap = new Map<string, number>();

    // Map resource name -> tên hiển thị tiếng Việt
    const RESOURCE_LABELS: Record<string, string> = {
        permission: "Hệ thống (System)",
        audit_log: "Hệ thống (System)",
        dashboard: "Hệ thống (System)",
        user: "Người dùng & Vai trò",
        role: "Người dùng & Vai trò",
        course: "Khoá học (Course)",
        section: "Chương học (Section)",
        lesson: "Bài học (Lesson)",
        tag: "Nhãn (Tag)",
        enrollment: "Ghi danh (Enrollment)",
        wishlist: "Danh sách yêu thích",
        order: "Đơn hàng (Order)",
        post: "Bài viết (Post)",
        comment: "Bình luận khoá học",
        post_comment: "Bình luận bài viết",
        media: "Media & File",
        interaction: "Tương tác (Like/Dislike)",
    };

    // Map permission name -> mô tả tiếng Việt
    const PERMISSION_LABELS: Record<string, { label: string; desc: string }> = {
        "permission.read": { label: "Xem danh sách quyền", desc: "Cho phép truy cập bảng phân quyền" },
        "permission.create": { label: "Tạo quyền mới", desc: "Khởi tạo thêm các endpoint permission" },
        "permission.update": { label: "Cập nhật quyền", desc: "Chỉnh sửa cấu hình permission" },
        "permission.delete": { label: "Xoá quyền", desc: "Xoá bỏ các permission cũ khỏi hệ thống" },
        "audit_log.read": { label: "Xem lịch sử hệ thống", desc: "Xem nhật ký thao tác audit logs" },
        "dashboard.read": { label: "Xem thống kê Dashboard", desc: "Truy cập trang báo cáo tổng quan" },
        "user.read": { label: "Xem danh sách User", desc: "Truy cập quản lý người dùng" },
        "user.create": { label: "Tạo User", desc: "Thêm người dùng mới" },
        "user.update": { label: "Sửa User", desc: "Cập nhật thông tin người dùng" },
        "user.delete": { label: "Xoá User", desc: "Xoá tài khoản người dùng" },
        "role.read": { label: "Xem danh sách Role", desc: "Truy cập quản lý vai trò" },
        "role.create": { label: "Tạo Role", desc: "Thêm vai trò mới" },
        "role.update": { label: "Sửa Role", desc: "Cập nhật vai trò" },
        "role.delete": { label: "Xoá Role", desc: "Xoá vai trò" },
        "course.read": { label: "Xem danh sách Course", desc: "Truy cập quản lý khoá học" },
        "course.create": { label: "Tạo Course", desc: "Thêm khoá học mới" },
        "course.update": { label: "Sửa Course", desc: "Cập nhật khoá học" },
        "course.delete": { label: "Xoá Course", desc: "Xoá khoá học" },
        "course.submit": { label: "Nộp Course", desc: "Nộp khoá học" },
        "course.approve": { label: "Duyệt Course", desc: "Duyệt khoá học" },
        "course.reject": { label: "Từ chối Course", desc: "Từ chối khoá học" },
        "course.unpublish": { label: "Ngưng bán Course", desc: "Huỷ xuất bản khoá học" },
        "section.read": { label: "Xem Section", desc: "Truy cập chương học" },
        "section.create": { label: "Tạo Section", desc: "Thêm chương học mới" },
        "section.update": { label: "Sửa Section", desc: "Cập nhật chương học" },
        "section.delete": { label: "Xoá Section", desc: "Xoá chương học" },
        "lesson.read": { label: "Xem Lesson", desc: "Truy cập bài học" },
        "lesson.create": { label: "Tạo Lesson", desc: "Thêm bài học mới" },
        "lesson.update": { label: "Sửa Lesson", desc: "Cập nhật bài học" },
        "lesson.delete": { label: "Xoá Lesson", desc: "Xoá bài học" },
        "tag.read": { label: "Xem Tag", desc: "Truy cập quản lý nhãn" },
        "tag.create": { label: "Tạo Tag", desc: "Thêm nhãn mới" },
        "tag.update": { label: "Sửa Tag", desc: "Cập nhật nhãn" },
        "tag.delete": { label: "Xoá Tag", desc: "Xoá nhãn" },
        "category.read": { label: "Xem Category", desc: "Truy cập quản lý danh mục" },
        "category.create": { label: "Tạo Category", desc: "Thêm danh mục mới" },
        "category.update": { label: "Sửa Category", desc: "Cập nhật danh mục" },
        "category.delete": { label: "Xoá Category", desc: "Xoá danh mục" },
        "enrollment.read": { label: "Xem ghi danh", desc: "Truy cập danh sách ghi danh" },
        "enrollment.create": { label: "Tạo ghi danh", desc: "Ghi danh học viên" },
        "enrollment.update": { label: "Sửa ghi danh", desc: "Cập nhật ghi danh" },
        "enrollment.delete": { label: "Xoá ghi danh", desc: "Xoá ghi danh" },
        "wishlist.read": { label: "Xem Wishlist", desc: "Truy cập danh sách yêu thích" },
        "wishlist.create": { label: "Tạo Wishlist", desc: "Thêm vào yêu thích" },
        "wishlist.delete": { label: "Xoá Wishlist", desc: "Xoá khỏi yêu thích" },
        "order.read": { label: "Xem đơn hàng", desc: "Truy cập quản lý đơn hàng" },
        "order.create": { label: "Tạo đơn hàng", desc: "Tạo đơn hàng mới" },
        "order.update": { label: "Sửa đơn hàng", desc: "Cập nhật đơn hàng" },
        "order.delete": { label: "Xoá đơn hàng", desc: "Xoá đơn hàng" },
        "post.read": { label: "Xem bài viết", desc: "Truy cập quản lý bài viết" },
        "post.create": { label: "Tạo bài viết", desc: "Thêm bài viết mới" },
        "post.update": { label: "Sửa bài viết", desc: "Cập nhật bài viết" },
        "post.delete": { label: "Xoá bài viết", desc: "Xoá bài viết" },
        "course_review.read": { label: "Xem đánh giá", desc: "Truy cập đánh giá khoá học" },
        "course_review.create": { label: "Tạo đánh giá", desc: "Thêm đánh giá" },
        "course_review.update": { label: "Sửa đánh giá", desc: "Cập nhật đánh giá" },
        "course_review.delete": { label: "Xoá đánh giá", desc: "Xoá đánh giá" },
        "post_comment.read": { label: "Xem bình luận bài viết", desc: "Truy cập bình luận bài viết" },
        "post_comment.create": { label: "Tạo bình luận bài viết", desc: "Thêm bình luận bài viết" },
        "post_comment.update": { label: "Sửa bình luận bài viết", desc: "Cập nhật bình luận bài viết" },
        "post_comment.delete": { label: "Xoá bình luận bài viết", desc: "Xoá bình luận bài viết" },
        "media.upload": { label: "Upload Media", desc: "Tải lên file/hình ảnh" },
        "media.delete": { label: "Xoá Media", desc: "Xoá file/hình ảnh" },
        "lesson.resource.create": { label: "Upload Tài nguyên bài học", desc: "Tải lên file pdf đính kèm bài học" },
        "lesson.resource.delete": { label: "Xoá Tài nguyên bài học", desc: "Xoá file pdf đính kèm bài học" },

        "interaction.react": { label: "Tương tác (Like/Dislike)", desc: "Like/Dislike bài học, bài viết, đánh giá" },
    };

    for (const permissionName of Object.values(PERMISSIONS) as string[]) {
        const rawResource = permissionName.split('.')[0];
        const resource = RESOURCE_LABELS[rawResource] || rawResource;
        const info = PERMISSION_LABELS[permissionName];
        
        const permission = await prisma.permission.upsert({
            where: {
                name: permissionName,
            },

            update: {
                resource: resource,
                label: info?.label || null,
                description: info?.desc || null,
            },

            create: {
                name: permissionName,
                resource: resource,
                label: info?.label || null,
                description: info?.desc || null,
            },
        });

        permissionMap.set(
            permission.name,
            permission.id,
        );

        console.log(
            `   ✓ ${permission.name}`,
        );
    }


    // ========================================================
    // 2. CREATE ROLES
    // ========================================================

    console.log('\n📌 Seeding roles...');

    const roleMap = new Map<string, number>();

    for (const roleDefinition of roleDefinitions) {
        const role = await prisma.role.upsert({
            where: {
                name: roleDefinition.name,
            },

            update: {},

            create: {
                name: roleDefinition.name,
                createdAt: new Date(),
            },
        });

        roleMap.set(
            role.name,
            role.id,
        );

        console.log(
            `   ✓ ${role.name}`,
        );
    }


    // ========================================================
    // 3. ASSIGN PERMISSIONS TO ROLES
    // ========================================================

    console.log('\n📌 Assigning permissions to roles...');

    for (const roleDefinition of roleDefinitions) {
        const roleId = roleMap.get(
            roleDefinition.name,
        );

        if (!roleId) {
            throw new Error(
                `Role "${roleDefinition.name}" not found`,
            );
        }

        let assignedCount = 0;

        for (
            const permissionName
            of roleDefinition.permissions
        ) {
            const permissionId =
                permissionMap.get(permissionName);

            if (!permissionId) {
                throw new Error(
                    `Permission "${permissionName}" not found`,
                );
            }

            await prisma.rolePermission.upsert({
                where: {
                    roleId_permissionId: {
                        roleId,
                        permissionId,
                    },
                },

                update: {},

                create: {
                    roleId,
                    permissionId,
                },
            });

            assignedCount++;
        }

        console.log(
            `   ✓ ${roleDefinition.name}: ${assignedCount} permissions`,
        );
    }


    // ========================================================
    // 4. CREATE USERS
    // ========================================================

    console.log('\n📌 Seeding users...');

    for (const seedUser of seedUsers) {
        const hashedPassword =
            await bcrypt.hash(
                seedUser.password,
                12,
            );

        const user = await prisma.user.upsert({
            where: {
                email: seedUser.email,
            },

            update: {
                name: seedUser.name,

                // Development:
                // reset password whenever seed runs
                password: hashedPassword,

                isActive: true,
                status: true,
                provider: ['local'],
            },

            create: {
                name: seedUser.name,
                email: seedUser.email,
                password: hashedPassword,

                isActive: true,
                status: true,
                provider: ['local'],
            },
        });

        console.log(
            `   ✓ ${user.email}`,
        );


        // ====================================================
        // 5. ASSIGN ROLE TO USER
        // ====================================================

        const roleId =
            roleMap.get(seedUser.role);

        if (!roleId) {
            throw new Error(
                `Role "${seedUser.role}" not found`,
            );
        }

        await prisma.userRole.upsert({
            where: {
                userId_roleId: {
                    userId: user.id,
                    roleId,
                },
            },

            update: {},

            create: {
                userId: user.id,
                roleId,
            },
        });

        console.log(
            `      ↳ Role: ${seedUser.role}`,
        );
    }


    // ========================================================
    // 6. SEED CATEGORIES
    // ========================================================

    console.log('\n📌 Seeding categories...');

    for (const cat of seedCategories) {
        await prisma.category.upsert({
            where: { id: cat.id },
            update: {
                name: cat.name,
                slug: cat.slug,
                description: cat.description,
                parentId: cat.parentId,
            },
            create: {
                id: cat.id,
                name: cat.name,
                slug: cat.slug,
                description: cat.description,
                parentId: cat.parentId,
            }
        });
        console.log(`   ✓ Category: ${cat.name}`);
    }


    // ========================================================
    // 7. SUMMARY
    // ========================================================

    console.log('\n========================================');
    console.log('✅ Database seed completed!');
    console.log('========================================');

    console.log('\n📊 Summary:');

    console.log(
        `   Permissions : ${Object.values(PERMISSIONS).length}`,
    );

    console.log(
        `   Roles       : ${roleDefinitions.length}`,
    );

    console.log(
        `   Users       : ${seedUsers.length}`,
    );

    console.log('\n🔐 Test accounts:');

    console.log(`
   ADMIN
   Email    : admin@example.com
   Password : Admin@123456

   INSTRUCTOR
   Email    : instructor@example.com
   Password : Instructor@123456

   USER
   Email    : user@example.com
   Password : User@123456
    `);
}


// ============================================================
// EXECUTE
// ============================================================

main()
    .catch((error) => {
        console.error('\n❌ Seed failed:');
        console.error(error);

        // process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });