import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { ResponseMessage } from '@/decorator/responseMessage.decorator';
import { RequirePermissions } from '@/decorator/permissions.decorator';
import { PERMISSIONS } from '@/authorization/constants/permission';
import { CurrentUser } from '@/decorator/current-user.decorator';
import type { AuthUser } from '@/auth/interfaces/auth-user.interface';

@Controller('lessons')
export class LessonsController {
    constructor(private readonly lessonsService: LessonsService) { }

    @Post()
    @RequirePermissions(
        PERMISSIONS.LESSON_CREATE,
    )
    @ResponseMessage('Tạo bài giảng thành công')
    create(@Body() createLessonDto: CreateLessonDto) {
        return this.lessonsService.create(createLessonDto);
    }

    @Get()
    @RequirePermissions(
        PERMISSIONS.LESSON_READ,
    )
    findAll() {
        return this.lessonsService.findAll();
    }

    @Get(':id')
    @RequirePermissions(
        PERMISSIONS.LESSON_READ,
    )
    findOne(@Param('id') id: string) {
        return this.lessonsService.findOne(+id);
    }

    @Patch(':id')
    @RequirePermissions(
        PERMISSIONS.LESSON_UPDATE,
    )
    @ResponseMessage('Cập nhật bài giảng thành công')
    update(@Param('id') id: number, @CurrentUser() user: AuthUser, @Body() updateLessonDto: UpdateLessonDto) {
        return this.lessonsService.update(+id, user.id, updateLessonDto);
    }

    @Delete(':id')
    @RequirePermissions(
        PERMISSIONS.LESSON_DELETE,
    )
    @ResponseMessage('Xóa bài giảng thành công')
    remove(@Param('id') id: number, @CurrentUser() user: AuthUser) {
        return this.lessonsService.remove(+id, user.id);
    }
}
