import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe, Req, Request } from '@nestjs/common';
import { CourseReviewsService } from './course-reviews.service';
import { CreateCourseReviewDto } from './dto/create-course-review.dto';
import { UpdateCourseReviewDto } from './dto/update-course-review.dto';
import { Public } from '@/decorator/public.decorator';
import { ResponseMessage } from '@/decorator/responseMessage.decorator';
import type { AuthUser } from '@/auth/interfaces/auth-user.interface';
import { CurrentUser } from '@/decorator/current-user.decorator';
import { RequirePermissions } from '@/decorator/permissions.decorator';
import { PERMISSIONS } from '@/authorization/constants/permission';
import { QueryCourseReviewDto } from './dto/query-courseReview.dto';

@Controller('/courses/:slug/reviews')
export class CourseReviewsController {
  constructor(private readonly courseReviewsService: CourseReviewsService) { }


  @Post()
  @RequirePermissions(
    PERMISSIONS.COURSE_REVIEW_CREATE,
  )
  @ResponseMessage('Đánh giá khóa học thành công')
  async create(@CurrentUser() user: AuthUser, @Param('slug') slug: string, @Body() createCourseReviewDto: CreateCourseReviewDto) {
    return this.courseReviewsService.create(user.id, slug, createCourseReviewDto);
  }

  @Public()
  @Get()
  @ResponseMessage('Lấy danh sách đánh giá thành công')
  async getReviews(
    @Request() req,
    @Param('slug') slug: string,
    @Query() query: QueryCourseReviewDto
  ) {
    return this.courseReviewsService.getReviews(
      req.user?.id,
      slug,
      query.page,
      query.limit,
      query.rating,
      query.search,
      query.sortOrder
    );
  }



  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.courseReviewsService.findOne(+id);
  }

  @Patch(':id')
  @RequirePermissions(
    PERMISSIONS.COURSE_REVIEW_UPDATE,
  )
  @ResponseMessage('Cập nhật đánh giá thành công')
  async update(@CurrentUser() user: AuthUser, @Param('slug') slug: string, @Param('id', ParseIntPipe) reviewId: number, @Body() updateCourseReviewDto: UpdateCourseReviewDto) {
    return this.courseReviewsService.update(user.id, slug, reviewId, updateCourseReviewDto);
  }

  @Delete(':id')
  @RequirePermissions(
    PERMISSIONS.COURSE_REVIEW_DELETE,
  )
  @ResponseMessage('Xóa đánh giá thành công')
  remove(@CurrentUser() user: AuthUser, @Param('slug') slug: string, @Param('id', ParseIntPipe) reviewId: number) {
    return this.courseReviewsService.remove(user.id, slug, reviewId);
  }
}
