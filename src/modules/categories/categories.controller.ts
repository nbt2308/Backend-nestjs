import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { BulkDeleteDto, BulkStatusDto, ChangeStatusDto, UpdateCategoryDto } from './dto/update-category.dto';
import { PERMISSIONS } from '@/authorization/constants/permission';
import { ResponseMessage } from '@/decorator/responseMessage.decorator';
import { RequirePermissions } from '@/decorator/permissions.decorator';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.CATEGORY_CREATE)
  @ResponseMessage('Tạo danh mục thành công')
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.CATEGORY_READ)
  @ResponseMessage('Lấy danh sách danh mục thành công')
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.CATEGORY_READ)
  @ResponseMessage('Lấy chi tiết danh mục thành công')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.CATEGORY_UPDATE)
  @ResponseMessage('Cập nhật danh mục thành công')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Post('change-status')
  @RequirePermissions(PERMISSIONS.CATEGORY_UPDATE)
  @ResponseMessage('Thay đổi trạng thái danh mục thành công')
  changeStatus(@Body() changeStatusDto: ChangeStatusDto) {
    return this.categoriesService.changeStatus(changeStatusDto);
  }

  @Post('bulk-status')
  @RequirePermissions(PERMISSIONS.CATEGORY_UPDATE)
  @ResponseMessage('Cập nhật trạng thái hàng loạt thành công')
  bulkStatus(@Body() bulkStatusDto: BulkStatusDto) {
    return this.categoriesService.bulkStatus(bulkStatusDto);
  }

  @Delete('bulk-delete')
  @RequirePermissions(PERMISSIONS.CATEGORY_DELETE)
  @ResponseMessage('Xóa hàng loạt danh mục thành công')
  bulkDelete(@Body() bulkDeleteDto: BulkDeleteDto) {
    return this.categoriesService.bulkDelete(bulkDeleteDto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.CATEGORY_DELETE)
  @ResponseMessage('Xóa danh mục thành công')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.remove(id);
  }
}
