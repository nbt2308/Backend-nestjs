import { Module } from '@nestjs/common';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';
import { CoursesModule } from '../courses/courses.module';
// import { PostsModule } from '../posts/posts.module';

@Module({
    imports: [CoursesModule],
    controllers: [HomeController],
    providers: [HomeService],
})
export class HomeModule { }