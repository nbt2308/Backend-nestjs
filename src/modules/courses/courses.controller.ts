import { Controller, Get, Post, Body, Patch, Param, Delete, Req, Query, DefaultValuePipe, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { BulkDeleteDto, BulkStatusDto, ChangeStatusDto, UpdateCourseDto } from './dto/update-course.dto';
import { ResponseMessage } from '@/decorator/responseMessage.decorator';
import { QueryCourseDto } from './dto/query-course.dto';
import { Public } from '@/decorator/public.decorator';
import { RequirePermissions } from '@/decorator/permissions.decorator';
import { PERMISSIONS } from '@/authorization/constants/permission';
import { CurrentUser } from '@/decorator/current-user.decorator';
import { User } from '@prisma/client';
import type { AuthUser } from '@/auth/interfaces/auth-user.interface';



@Controller('courses')
export class CoursesController {
    constructor(private readonly coursesService: CoursesService) { }

    @Public()
    @ResponseMessage('Lấy danh sách khóa học thành công')
    @Get('courses-for-user')
    async findAllCourseForUser(
        @Query() query: QueryCourseDto,
    ) {
        return this.coursesService.findAllCourseForUser(
            query.page ?? 1,
            query.limit ?? 10,
            query.sortBy ?? 'createdAt',
            query.sortOrder ?? 'desc',
            query.search,
            {
                level: query.level,
                rating: query.rating !== undefined ? Number(query.rating) : undefined,
                courseType: query.courseType,
                tag: query.tag,
            },
        );
    }

    @Public()
    @ResponseMessage('Lấy danh sách khóa học thành công')
    @Get(':slug/related-courses')
    async findRelatedCoursesBySlug(
        @Param('slug') slug: string
    ) {
        return this.coursesService.findRelatedCoursesBySlug(slug);

    }
    @Post()
    @RequirePermissions(
        PERMISSIONS.COURSE_CREATE,
    )
    @ResponseMessage('Tạo khóa học thành công')
    async create(@Req() req: Request, @Body() createCourseDto: CreateCourseDto) {
        const result = await this.coursesService.create(createCourseDto);
        return result;
    }

    @Get()
    @RequirePermissions(
        PERMISSIONS.COURSE_READ,
    )
    async findAllPaginate(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
        @Query('sortBy', new DefaultValuePipe('createdAt')) sortBy: string,
        @Query('sortOrder', new DefaultValuePipe('desc')) sortOrder: 'asc' | 'desc',
        @Query('search', new DefaultValuePipe('')) search: string
    ) {
        return this.coursesService.findAllPaginate(page, limit, sortBy, sortOrder, search);
    }

    @Get('all')
    @RequirePermissions(
        PERMISSIONS.COURSE_READ,
    )
    async findAll() {
        return this.coursesService.findAll();
    }

    @Patch(':id')
    @RequirePermissions(
        PERMISSIONS.COURSE_UPDATE,
    )
    @ResponseMessage('Cập nhật khoá học thành công')
    async update(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() updateCourseDto: UpdateCourseDto) {
        const result = await this.coursesService.update(id, user.id, updateCourseDto);
        return result;
    }

    @Post('change-status')
    @RequirePermissions(
        PERMISSIONS.COURSE_UPDATE,
    )
    @ResponseMessage('Cập nhật trạng thái khoá học thành công')
    @HttpCode(HttpStatus.OK)
    async updateStatus(@CurrentUser() user: AuthUser, @Body() changeStatusDto: ChangeStatusDto) {
        return await this.coursesService.changeStatus(user.id, changeStatusDto);
    }

    @Delete(':id')
    @RequirePermissions(
        PERMISSIONS.COURSE_DELETE,
    )
    @ResponseMessage('Xóa khóa học thành công')
    async remove(@Param('id') id: string) {
        return await this.coursesService.remove(id);
    }

    @Delete('soft/:id')
    @RequirePermissions(
        PERMISSIONS.COURSE_DELETE,
    )
    @ResponseMessage('Xóa khóa học thành công')
    async softDelete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
        return await this.coursesService.softDelete(user.id, id);
    }

    @Post('bulk-delete')
    @RequirePermissions(
        PERMISSIONS.COURSE_DELETE,
    )
    @ResponseMessage('Xóa khoá học thành công')
    @HttpCode(HttpStatus.OK)
    async bulkDelete(@CurrentUser() user: AuthUser, @Body() bulkDeleteDto: BulkDeleteDto) {
        return await this.coursesService.bulkDelete(user.id, bulkDeleteDto);
    }

    @Post('bulk-update-status')
    @RequirePermissions(
        PERMISSIONS.COURSE_UPDATE,
    )
    @ResponseMessage('Cập nhật trạng thái khoá học thành công')
    @HttpCode(HttpStatus.OK)
    async bulkStatus(@CurrentUser() user: AuthUser, @Body() bulkStatusDto: BulkStatusDto) {
        return await this.coursesService.bulkStatus(user.id, bulkStatusDto);
    }



    @Get(':slug/preview/:lessonId')
    @Public()
    @ResponseMessage('Lấy video xem trước thành công')
    async getPreviewLesson(
        @Param('slug') slug: string,
        @Param('lessonId', ParseIntPipe) lessonId: number,
    ) {
        return this.coursesService.getPreviewLesson(slug, lessonId);
    }

    @Get(':slug')
    @Public()
    @ResponseMessage('Lấy thông tin khóa học thành công')
    async findOne(@Param('slug') slug: string, @CurrentUser() user: AuthUser) {
        return this.coursesService.findOneBySlug(slug, user?.id);
    }
}
