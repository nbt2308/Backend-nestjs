import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe, DefaultValuePipe, HttpCode, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { BulkDeleteDto, BulkStatusDto, ChangeStatusDto, UpdateUserDto } from './dto/update-user.dto';
import { ResponseMessage } from '@/decorator/responseMessage.decorator';
import { RequirePermissions } from '@/decorator/permissions.decorator';
import { PERMISSIONS } from '@/authorization/constants/permission';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post()
    @RequirePermissions(
        PERMISSIONS.USER_CREATE,
    )
    @ResponseMessage('Thêm người dùng thành công')
    async create(@Body() createUserDto: CreateUserDto) {
        const result = await this.usersService.createUser(createUserDto)
        return result;
    }

    @Get()
    @RequirePermissions(
        PERMISSIONS.USER_READ,
    )
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
    @RequirePermissions(
        PERMISSIONS.USER_READ,
    )
    @ResponseMessage("Lấy danh sách giảng viên thành công")
    async findAllInstructor() {
        return this.usersService.findAllInstructor();
    }

    @Get(':id')
    @RequirePermissions(
        PERMISSIONS.USER_READ,
    )
    findOne(@Param('id') id: string) {
        return this.usersService.findOne(+id);
    }

    @Patch(':id')
    @RequirePermissions(
        PERMISSIONS.USER_UPDATE,
    )
    @ResponseMessage('Cập nhật người dùng thành công')
    async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
        const result = await this.usersService.update(id, updateUserDto);
        return result;
    }

    @Post('change-status')
    @RequirePermissions(
        PERMISSIONS.USER_UPDATE,
    )
    @ResponseMessage('Cập nhật trạng thái người dùng thành công')
    @HttpCode(HttpStatus.OK)
    async updateStatus(@Body() changeStatusDto: ChangeStatusDto) {
        return await this.usersService.changeStatus(changeStatusDto);
    }

    @Delete(':id')
    @RequirePermissions(
        PERMISSIONS.USER_DELETE,
    )
    @ResponseMessage('Xóa người dùng thành công')
    async remove(@Param('id') id: string) {
        return await this.usersService.remove(id);
    }

    @Delete('soft/:id')
    @RequirePermissions(
        PERMISSIONS.USER_DELETE,
    )
    @ResponseMessage('Xóa người dùng thành công')
    async softDelete(@Param('id') id: string) {
        return await this.usersService.softDelete(id);
    }

    @Post('bulk-delete')
    @RequirePermissions(
        PERMISSIONS.USER_DELETE,
    )
    @ResponseMessage('Xóa người dùng thành công')
    @HttpCode(HttpStatus.OK)
    async bulkDelete(@Body() bulkDeleteDto: BulkDeleteDto) {
        return await this.usersService.bulkDelete(bulkDeleteDto);
    }

    @Post('bulk-update-status')
    @RequirePermissions(
        PERMISSIONS.USER_UPDATE,
    )
    @ResponseMessage('Cập nhật trạng thái người dùng thành công')
    @HttpCode(HttpStatus.OK)
    async bulkStatus(@Body() bulkStatusDto: BulkStatusDto) {
        return await this.usersService.bulkStatus(bulkStatusDto);
    }
}
