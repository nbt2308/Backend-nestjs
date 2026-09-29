import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, ParseIntPipe, UploadedFiles, BadRequestException, UploadedFile } from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { ResponseMessage } from '@/decorator/responseMessage.decorator';
import { RequirePermissions } from '@/decorator/permissions.decorator';
import { PERMISSIONS } from '@/authorization/constants/permission';
import { CurrentUser } from '@/decorator/current-user.decorator';
import type { AuthUser } from '@/auth/interfaces/auth-user.interface';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import 'multer';
import { diskStorage } from 'multer';
import { uuidv4 } from 'uuidv7';
@Controller('lessons')
export class LessonsController {
    constructor(private readonly lessonsService: LessonsService) { }

    @Post(':lessonId/resources')
    @UseInterceptors(FilesInterceptor('files', 5,{
      limits: {
        fileSize: 20 * 1024 * 1024,
      },
    }))
    @ResponseMessage('Upload tài liệu thành công')
    @RequirePermissions(
        PERMISSIONS.LESSON_RESOURCE_CREATE,
    )
    async uploadResources(
        @CurrentUser() user: AuthUser,
        @Param('lessonId', ParseIntPipe) lessonId: number,
        @UploadedFiles() files: Express.Multer.File[],
    ) {
        return this.lessonsService.uploadResources(user.id, lessonId, files);
    }

    @Get(':lessonId/resources/:resourceId/download')
    @ResponseMessage('Lấy link tải tài liệu thành công')
    @RequirePermissions(
        PERMISSIONS.LESSON_READ,
    )
    async downloadResource(
        @Param('lessonId', ParseIntPipe) lessonId: number,
        @Param('resourceId', ParseIntPipe) resourceId: number,
        @CurrentUser() user: AuthUser,
    ) {
        return this.lessonsService.downloadResources(user.id, lessonId, resourceId);
    }

    @Post()
    @RequirePermissions(
        PERMISSIONS.LESSON_CREATE,
    )
    @ResponseMessage('Tạo bài giảng thành công')
    @UseInterceptors(
        FileInterceptor('video', {
            storage: diskStorage({
                destination: './uploads/videos',
                filename: (_, file, cb) => {
                    const extension = file.originalname.split('.').pop();
                    cb(null, `${uuidv4()}${extension ? `.${extension}` : ''}`); //save file vào thư mục uploads/videos với tên file ngẫu nhiên
                },
            }),
            limits: {
                fileSize: 2 * 1024 * 1024 * 1024, //limit 2GB
            },
            fileFilter: (_, file, cb) => {
                if (!file.mimetype.startsWith('video/')) {
                    return cb(new BadRequestException('Chỉ được upload file video'),false);
                }
                cb(null, true);
            },
        }),
    )
    create(@CurrentUser() user: AuthUser, @Body() createLessonDto: CreateLessonDto, @UploadedFile() videoFile: Express.Multer.File) {
        return this.lessonsService.create(user.id, createLessonDto, videoFile);
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
    @UseInterceptors(
        FileInterceptor('video', {
            storage: diskStorage({
                destination: './uploads/videos',
                filename: (_, file, cb) => {
                    const extension = file.originalname.split('.').pop();
                    cb(null, `${uuidv4()}${extension ? `.${extension}` : ''}`); //save file vào thư mục uploads/videos với tên file ngẫu nhiên
                },
            }),
            limits: {
                fileSize: 2 * 1024 * 1024 * 1024, //limit 2GB
            },
            fileFilter: (_, file, cb) => {
                if (!file.mimetype.startsWith('video/')) {
                    return cb(new BadRequestException('Chỉ được upload file video'),false);
                }
                cb(null, true);
            },
        }),
    )
    update(@Param('id') id: number, @CurrentUser() user: AuthUser, @Body() updateLessonDto: UpdateLessonDto, @UploadedFile() videoFile: Express.Multer.File) {
        return this.lessonsService.update(+id, user.id, updateLessonDto, videoFile);
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
