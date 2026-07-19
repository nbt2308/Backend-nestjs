import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe, DefaultValuePipe, HttpCode, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { BulkDeleteDto, BulkStatusDto, UpdateUserDto } from './dto/update-user.dto';
import { ResponseMessage } from '@/decorator/responseMessage.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post()
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

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.usersService.remove(id);
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  async bulkDelete(@Body() bulkDeleteDto: BulkDeleteDto) {
    return await this.usersService.bulkDelete(bulkDeleteDto);
  }

  @Post('bulk-update-status')
  @HttpCode(HttpStatus.OK)
  async bulkStatus(@Body() bulkStatusDto: BulkStatusDto) {
    return await this.usersService.bulkStatus(bulkStatusDto);
  }
}
