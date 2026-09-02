import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { CoursesModule } from './modules/courses/courses.module';
import { SectionsModule } from './modules/sections/sections.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { WishlistsModule } from './modules/wishlists/wishlists.module';
import { PostsModule } from './modules/posts/posts.module';
import { CourseCommentsModule } from './modules/course-comments/course-comments.module';
import { PostCommentsModule } from './modules/post-comments/post-comments.module';
import { OrdersModule } from './modules/orders/orders.module';
import { OrderItemsModule } from './modules/order-items/order-items.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtAuthGuard } from './auth/passport/jwt-auth.guard';
import { MailModule } from './mail/mail.module';
import { TransformInterceptor } from './core/transform.interceptor';
import { MediaModule } from './media/media.module';
import { TagsModule } from './modules/tags/tags.module';
import { YoutubeModule } from './youtube/youtube.module';
import { HomeModule } from './modules/home/home.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthCronService } from './auth/auth-cron.service';
import { AuthorizationModule } from './authorization/authorization.module';
import { PermissionGuard } from './authorization/guards/permission.guard';
@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true, expandVariables: true }),
        ScheduleModule.forRoot(),
        UsersModule,
        CoursesModule,
        SectionsModule,
        LessonsModule,
        WishlistsModule,
        PostsModule,
        CourseCommentsModule,
        PostCommentsModule,
        OrdersModule,
        OrderItemsModule,
        PrismaModule,
        AuthModule,
        MailModule,
        MediaModule,
        TagsModule,
        YoutubeModule,
        HomeModule,
        AuthorizationModule,
    ],
    controllers: [AppController],
    providers: [AppService,
        AuthCronService,
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
        },
        {
            provide: APP_GUARD,
            useClass: PermissionGuard,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: TransformInterceptor,
        },
    ],
})
export class AppModule { }
