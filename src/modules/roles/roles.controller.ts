import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, DefaultValuePipe, Query, ParseIntPipe } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { BulkDeleteDto, ChangeStatusDto, UpdateRoleDto } from './dto/update-role.dto';
import { RequirePermissions } from '@/decorator/permissions.decorator';
import { ResponseMessage } from '@/decorator/responseMessage.decorator';
import { PERMISSIONS } from '@/authorization/constants/permission';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) { }

  @Post()
  @RequirePermissions(
    PERMISSIONS.ROLE_CREATE,
  )
  @ResponseMessage("Thêm mới Role thành công")
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  @Get()
  @RequirePermissions(
    PERMISSIONS.ROLE_READ,
  )
  @ResponseMessage("Lấy danh sách tất cả Role thành công")
  @HttpCode(HttpStatus.OK)
  async findAllPaginate(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('sortBy', new DefaultValuePipe('createdAt')) sortBy: string,
    @Query('sortOrder', new DefaultValuePipe('desc')) sortOrder: 'asc' | 'desc',
    @Query('search', new DefaultValuePipe('')) search: string
  ) {
    return this.rolesService.findAllPaginate(page, limit, sortBy, sortOrder, search);
  }

  @Get("all")
  @RequirePermissions(
    PERMISSIONS.ROLE_READ,
  )
  @ResponseMessage("Lấy danh sách tất cả role thành công")
  async findAll() {
    return this.rolesService.findAll();
  }

  // @Get(':id')
  // @RequirePermissions(
  //   PERMISSIONS.ROLE_READ,
  // )
  // findOne(@Param('id') id: string) {
  //   return this.rolesService.findOne(+id);
  // }

  @Patch(':id')
  @RequirePermissions(
    PERMISSIONS.ROLE_UPDATE,
  )
  @ResponseMessage('Cập nhật role thành công')
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateRoleDto: UpdateRoleDto) {
    return await this.rolesService.update(id, updateRoleDto);
  }

  @Delete(':id')
  @RequirePermissions(
    PERMISSIONS.ROLE_DELETE,
  )
  @ResponseMessage('Xóa role thành công')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.remove(id);
  }

  @Post('change-status')
  @RequirePermissions(
    PERMISSIONS.ROLE_UPDATE,
  )
  @ResponseMessage('Cập nhật trạng thái role thành công')
  @HttpCode(HttpStatus.OK)
  async updateStatus(@Body() changeStatusDto: ChangeStatusDto) {
    return await this.rolesService.changeStatus(changeStatusDto);
  }

  @Post('bulk-delete')
  @RequirePermissions(
    PERMISSIONS.ROLE_DELETE,
  )
  @ResponseMessage('Xóa role thành công')
  @HttpCode(HttpStatus.OK)
  async bulkDelete(@Body() bulkDeleteDto: BulkDeleteDto) {
    return await this.rolesService.bulkDelete(bulkDeleteDto);
  }
}
