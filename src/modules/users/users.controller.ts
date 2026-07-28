import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe, DefaultValuePipe, HttpCode, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { BulkDeleteDto, BulkStatusDto, ChangeStatusDto, UpdateUserDto } from './dto/update-user.dto';
import { ResponseMessage } from '@/decorator/responseMessage.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post()
  @ResponseMessage('Thêm người dùng thành công')
  async create(@Body() createUserDto: CreateUserDto) {
    const result = await this.usersService.createUser(createUserDto)
    return result;
  }

  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('sortBy', new DefaultValuePipe('createdAt')) sortBy: string,
    @Query('sortOrder', new DefaultValuePipe('desc')) sortOrder: 'asc' | 'desc',
    @Query('search', new DefaultValuePipe('')) search: string
  ) {
    return this.usersService.findAll(page, limit, sortBy, sortOrder, search);
  }

  @Get("instructor")
  @ResponseMessage("Lấy danh sách giảng viên thành công")
  async findAllInstructor() {
    return this.usersService.findAllInstructor();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Patch()
  @ResponseMessage('Cập nhật người dùng thành công')
  async update(@Body() updateUserDto: UpdateUserDto) {
    const result = await this.usersService.update(updateUserDto);
    return result;
  }

  @Post('change-status')
  @ResponseMessage('Cập nhật trạng thái người dùng thành công')
  @HttpCode(HttpStatus.OK)
  async updateStatus(@Body() changeStatusDto: ChangeStatusDto) {
    return await this.usersService.changeStatus(changeStatusDto);
  }

  @Delete(':id')
  @ResponseMessage('Xóa người dùng thành công')
  async remove(@Param('id') id: string) {
    return await this.usersService.remove(id);
  }

  @Post('bulk-delete')
  @ResponseMessage('Xóa người dùng thành công')
  @HttpCode(HttpStatus.OK)
  async bulkDelete(@Body() bulkDeleteDto: BulkDeleteDto) {
    return await this.usersService.bulkDelete(bulkDeleteDto);
  }

  @Post('bulk-update-status')
  @ResponseMessage('Cập nhật trạng thái người dùng thành công')
  @HttpCode(HttpStatus.OK)
  async bulkStatus(@Body() bulkStatusDto: BulkStatusDto) {
    return await this.usersService.bulkStatus(bulkStatusDto);
  }
}
