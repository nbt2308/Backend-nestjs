import { Injectable } from '@nestjs/common';
import { CreateCourseCommentDto } from './dto/create-course-comment.dto';
import { UpdateCourseCommentDto } from './dto/update-course-comment.dto';

@Injectable()
export class CourseCommentsService {
  create(createCourseCommentDto: CreateCourseCommentDto) {
    return 'This action adds a new courseComment';
  }

  findAll() {
    return `This action returns all courseComments`;
  }

  findOne(id: number) {
    return `This action returns a #${id} courseComment`;
  }

  update(id: number, updateCourseCommentDto: UpdateCourseCommentDto) {
    return `This action updates a #${id} courseComment`;
  }

  remove(id: number) {
    return `This action removes a #${id} courseComment`;
  }
}
