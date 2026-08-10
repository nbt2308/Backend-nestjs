import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, DefaultValuePipe, ParseIntPipe, Query } from '@nestjs/common';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { BulkDeleteDto, BulkStatusDto, ChangeStatusDto, UpdateTagDto } from './dto/update-tag.dto';
import { ResponseMessage } from '@/decorator/responseMessage.decorator';

@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) { }

  @Post()
  @ResponseMessage("Thêm mới Tag thành công")
  create(@Body() createTagDto: CreateTagDto) {
    return this.tagsService.create(createTagDto);
  }

  @Get()
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
  @ResponseMessage("Lấy danh sách tất cả tag thành công")
  async findAll() {
    return this.tagsService.findAll();
  }


  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tagsService.findOne(+id);
  }

  @Patch(':id')
  @ResponseMessage('Cập nhật tag thành công')
  async update(@Param('id') id: number, @Body() updateTagDto: UpdateTagDto) {
    return await this.tagsService.update(+id, updateTagDto);
  }

  @Delete(':id')
  @ResponseMessage('Xóa tag thành công')
  remove(@Param('id') id: string) {
    return this.tagsService.remove(+id);
  }

  @Post('change-status')
  @ResponseMessage('Cập nhật trạng thái tag thành công')
  @HttpCode(HttpStatus.OK)
  async updateStatus(@Body() changeStatusDto: ChangeStatusDto) {
    return await this.tagsService.changeStatus(changeStatusDto);
  }

  @Post('bulk-delete')
  @ResponseMessage('Xóa tag thành công')
  @HttpCode(HttpStatus.OK)
  async bulkDelete(@Body() bulkDeleteDto: BulkDeleteDto) {
    return await this.tagsService.bulkDelete(bulkDeleteDto);
  }

  @Post('bulk-status')
  @ResponseMessage('Cập nhật trạng thái tag thành công')
  @HttpCode(HttpStatus.OK)
  async bulkStatus(@Body() bulkStatusDto: BulkStatusDto) {
    return await this.tagsService.bulkStatus(bulkStatusDto);
  }
}
