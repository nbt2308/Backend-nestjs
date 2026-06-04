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
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/passport/jwt-auth.guard';
import { MailModule } from './mail/mail.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, expandVariables: true }),
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
    MailModule
  ],
  controllers: [AppController],
  providers: [AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule { }
