import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { SectionsService } from './sections.service';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { ResponseMessage } from '@/decorator/responseMessage.decorator';

@Controller('sections')
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) { }

  @Post()
  @ResponseMessage('Tạo chương mới thành công')
  async create(@Body() createSectionDto: CreateSectionDto) {
    return await this.sectionsService.create(createSectionDto);
  }

  @Get()
  @ResponseMessage('Lấy danh sách chương thành công')
  async findAll(@Query("courseId") courseId: string) {
    return await this.sectionsService.findAll(courseId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sectionsService.findOne(+id);
  }

  @Patch(':id')
  @ResponseMessage('Cập nhật chương của khoá học thành công')
  update(@Param('id') id: number, @Body() updateSectionDto: UpdateSectionDto) {
    return this.sectionsService.update(id, updateSectionDto);
  }

  @Delete(':id')
  @ResponseMessage('Xoá chương của khoá học thành công')
  remove(@Param('id') id: number) {
    return this.sectionsService.remove(id);
  }
}
