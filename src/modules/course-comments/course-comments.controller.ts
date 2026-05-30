import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CourseCommentsService } from './course-comments.service';
import { CreateCourseCommentDto } from './dto/create-course-comment.dto';
import { UpdateCourseCommentDto } from './dto/update-course-comment.dto';

@Controller('course-comments')
export class CourseCommentsController {
  constructor(private readonly courseCommentsService: CourseCommentsService) {}

  @Post()
  create(@Body() createCourseCommentDto: CreateCourseCommentDto) {
    return this.courseCommentsService.create(createCourseCommentDto);
  }

  @Get()
  findAll() {
    return this.courseCommentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.courseCommentsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCourseCommentDto: UpdateCourseCommentDto) {
    return this.courseCommentsService.update(+id, updateCourseCommentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.courseCommentsService.remove(+id);
  }
}
