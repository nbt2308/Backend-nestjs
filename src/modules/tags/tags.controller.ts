import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, DefaultValuePipe, ParseIntPipe, Query } from '@nestjs/common';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { BulkDeleteDto, BulkStatusDto, ChangeStatusDto, UpdateTagDto } from './dto/update-tag.dto';
import { ResponseMessage } from '@/decorator/responseMessage.decorator';
import { Public } from '@/decorator/public.decorator';
import { RequirePermissions } from '@/decorator/permissions.decorator';
import { PERMISSIONS } from '@/authorization/constants/permission';

@Controller('tags')
export class TagsController {
    constructor(private readonly tagsService: TagsService) { }

    @Post()
    @RequirePermissions(
        PERMISSIONS.TAG_CREATE,
    )
    @ResponseMessage("Thêm mới Tag thành công")
    create(@Body() createTagDto: CreateTagDto) {
        return this.tagsService.create(createTagDto);
    }

    @Get()
    @RequirePermissions(
        PERMISSIONS.TAG_READ,
    )
    @ResponseMessage("Lấy danh sách tất cả tag thành công")
    @HttpCode(HttpStatus.OK)
    async findAllPaginate(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
        @Query('sortBy', new DefaultValuePipe('createdAt')) sortBy: string,
        @Query('sortOrder', new DefaultValuePipe('desc')) sortOrder: 'asc' | 'desc',
        @Query('search', new DefaultValuePipe('')) search: string
    ) {
        return this.tagsService.findAllPaginate(page, limit, sortBy, sortOrder, search);
    }

    @Get("all")
    @RequirePermissions(
        PERMISSIONS.TAG_READ,
    )
    @ResponseMessage("Lấy danh sách tất cả tag thành công")
    async findAll() {
        return this.tagsService.findAll();
    }

    @Public()
    @Get("tags-for-user")
    @ResponseMessage("Lấy danh sách tất cả tag thành công")
    async findAllForUser() {
        return this.tagsService.findAllForUser();
    }


    @Get(':id')
    @RequirePermissions(
        PERMISSIONS.TAG_READ,
    )
    findOne(@Param('id') id: string) {
        return this.tagsService.findOne(+id);
    }

    @Patch(':id')
    @RequirePermissions(
        PERMISSIONS.TAG_UPDATE,
    )
    @ResponseMessage('Cập nhật tag thành công')
    async update(@Param('id') id: number, @Body() updateTagDto: UpdateTagDto) {
        return await this.tagsService.update(+id, updateTagDto);
    }

    @Delete(':id')
    @RequirePermissions(
        PERMISSIONS.TAG_DELETE,
    )
    @ResponseMessage('Xóa tag thành công')
    remove(@Param('id') id: string) {
        return this.tagsService.remove(+id);
    }

    @Post('change-status')
    @RequirePermissions(
        PERMISSIONS.TAG_UPDATE,
    )
    @ResponseMessage('Cập nhật trạng thái tag thành công')
    @HttpCode(HttpStatus.OK)
    async updateStatus(@Body() changeStatusDto: ChangeStatusDto) {
        return await this.tagsService.changeStatus(changeStatusDto);
    }

    @Post('bulk-delete')
    @RequirePermissions(
        PERMISSIONS.TAG_DELETE,
    )
    @ResponseMessage('Xóa tag thành công')
    @HttpCode(HttpStatus.OK)
    async bulkDelete(@Body() bulkDeleteDto: BulkDeleteDto) {
        return await this.tagsService.bulkDelete(bulkDeleteDto);
    }

    @Post('bulk-status')
    @RequirePermissions(
        PERMISSIONS.TAG_UPDATE,
    )
    @ResponseMessage('Cập nhật trạng thái tag thành công')
    @HttpCode(HttpStatus.OK)
    async bulkStatus(@Body() bulkStatusDto: BulkStatusDto) {
        return await this.tagsService.bulkStatus(bulkStatusDto);
    }
}
