import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { SectionsService } from './sections.service';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { ResponseMessage } from '@/decorator/responseMessage.decorator';
import { RequirePermissions } from '@/decorator/permissions.decorator';
import { PERMISSIONS } from '@/authorization/constants/permission';
import { CurrentUser } from '@/decorator/current-user.decorator';
import type { AuthUser } from '@/auth/interfaces/auth-user.interface';

@Controller('sections')
export class SectionsController {
    constructor(private readonly sectionsService: SectionsService) { }

    @Post()
    @RequirePermissions(
        PERMISSIONS.SECTION_CREATE,
    )
    @ResponseMessage('Tạo chương mới thành công')
    async create(@Body() createSectionDto: CreateSectionDto) {
        return await this.sectionsService.create(createSectionDto);
    }

    @Get()
    @RequirePermissions(
        PERMISSIONS.SECTION_READ,
    )
    @ResponseMessage('Lấy danh sách chương thành công')
    async findAll(@Query("courseId") courseId: string) {
        return await this.sectionsService.findAll(courseId);
    }

    @Get(':id')
    @RequirePermissions(
        PERMISSIONS.SECTION_READ,
    )
    findOne(@Param('id') id: string) {
        return this.sectionsService.findOne(+id);
    }

    @Patch(':id')
    @RequirePermissions(
        PERMISSIONS.SECTION_UPDATE,
    )
    @ResponseMessage('Cập nhật chương của khoá học thành công')
    update(@Param('id') id: number, @CurrentUser() user: AuthUser, @Body() updateSectionDto: UpdateSectionDto) {
        return this.sectionsService.update(id, user.id, updateSectionDto);
    }

    @Delete(':id')
    @RequirePermissions(
        PERMISSIONS.SECTION_DELETE,
    )
    @ResponseMessage('Xoá chương của khoá học thành công')
    remove(@Param('id') id: number, @CurrentUser() user: AuthUser) {
        return this.sectionsService.remove(id, user.id);
    }
}
