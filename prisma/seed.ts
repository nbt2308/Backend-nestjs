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
    USER: 'USER',
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

    // Enrollment
    PERMISSIONS.ENROLLMENT_READ,

    // Wishlist
    PERMISSIONS.WISHLIST_READ,

    // Post
    PERMISSIONS.POST_READ,
    PERMISSIONS.POST_CREATE,
    PERMISSIONS.POST_UPDATE,
    PERMISSIONS.POST_DELETE,

    // Course Comment
    PERMISSIONS.COURSE_COMMENT_READ,
    PERMISSIONS.COURSE_COMMENT_CREATE,
    PERMISSIONS.COURSE_COMMENT_UPDATE,
    PERMISSIONS.COURSE_COMMENT_DELETE,

    // Post Comment
    PERMISSIONS.POST_COMMENT_READ,
    PERMISSIONS.POST_COMMENT_CREATE,
    PERMISSIONS.POST_COMMENT_UPDATE,
    PERMISSIONS.POST_COMMENT_DELETE,

    // Media
    PERMISSIONS.MEDIA_UPLOAD,
    PERMISSIONS.MEDIA_DELETE,
];

const USER_PERMISSIONS = [
    // Course
    PERMISSIONS.COURSE_READ,

    // Section
    PERMISSIONS.SECTION_READ,

    // Lesson
    PERMISSIONS.LESSON_READ,

    // Tag
    PERMISSIONS.TAG_READ,

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

    // Course Comment
    PERMISSIONS.COURSE_COMMENT_READ,
    PERMISSIONS.COURSE_COMMENT_CREATE,
    PERMISSIONS.COURSE_COMMENT_UPDATE,
    PERMISSIONS.COURSE_COMMENT_DELETE,

    // Post Comment
    PERMISSIONS.POST_COMMENT_READ,
    PERMISSIONS.POST_COMMENT_CREATE,
    PERMISSIONS.POST_COMMENT_UPDATE,
    PERMISSIONS.POST_COMMENT_DELETE,
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
        name: ROLES.USER,
        permissions: USER_PERMISSIONS,
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
        role: ROLES.USER,
    },
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

    for (const permissionName of Object.values(PERMISSIONS) as string[]) {
        const permission = await prisma.permission.upsert({
            where: {
                name: permissionName,
            },

            update: {},

            create: {
                name: permissionName,
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
    // 6. SUMMARY
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