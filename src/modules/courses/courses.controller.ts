import { Controller, Get, Post, Body, Patch, Param, Delete, Req, Query, DefaultValuePipe, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { BulkDeleteDto, BulkStatusDto, ChangeStatusDto, UpdateCourseDto } from './dto/update-course.dto';
import { ResponseMessage } from '@/decorator/responseMessage.decorator';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) { }

  @Post()
  @ResponseMessage('Tạo khóa học thành công')
  async create(@Req() req: Request, @Body() createCourseDto: CreateCourseDto) {
    const result = await this.coursesService.create(createCourseDto);
    return result;
  }

  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('sortBy', new DefaultValuePipe('createdAt')) sortBy: string,
    @Query('sortOrder', new DefaultValuePipe('desc')) sortOrder: 'asc' | 'desc',
    @Query('search', new DefaultValuePipe('')) search: string
  ) {
    return this.coursesService.findAll(page, limit, sortBy, sortOrder, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.coursesService.findOne(+id);
  }

  @Patch(':id')
  @ResponseMessage('Cập nhật khoá học thành công')
  async update(@Param('id') id: string, @Body() updateCourseDto: UpdateCourseDto) {
    const result = await this.coursesService.update(id, updateCourseDto);
    return result;
  }

  @Post('change-status')
  @ResponseMessage('Cập nhật trạng thái khoá học thành công')
  @HttpCode(HttpStatus.OK)
  async updateStatus(@Body() changeStatusDto: ChangeStatusDto) {
    return await this.coursesService.changeStatus(changeStatusDto);
  }

  @Delete(':id')
  @ResponseMessage('Xóa khóa học thành công')
  async remove(@Param('id') id: string) {
    return await this.coursesService.remove(id);
  }

  @Post('bulk-delete')
  @ResponseMessage('Xóa khoá học thành công')
  @HttpCode(HttpStatus.OK)
  async bulkDelete(@Body() bulkDeleteDto: BulkDeleteDto) {
    return await this.coursesService.bulkDelete(bulkDeleteDto);
  }

  @Post('bulk-update-status')
  @ResponseMessage('Cập nhật trạng thái khoá học thành công')
  @HttpCode(HttpStatus.OK)
  async bulkStatus(@Body() bulkStatusDto: BulkStatusDto) {
    return await this.coursesService.bulkStatus(bulkStatusDto);
  }
}
