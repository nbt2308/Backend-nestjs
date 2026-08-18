import { Injectable } from "@nestjs/common";
import { CoursesService } from "../courses/courses.service";
import { PostsService } from "../posts/posts.service";
@Injectable()
export class HomeService {
    constructor(
        private readonly courseService: CoursesService,
        // private readonly postService: PostsService,
    ) { }

    async getHomeData() {
        const [popularCourses] = await Promise.all([
            this.courseService.findPopularCourses(3),
            // this.postService.getLatestPosts(3),
        ]);

        return {
            popularCourses,
        };
    }
}