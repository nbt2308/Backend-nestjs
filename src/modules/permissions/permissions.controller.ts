import { Controller, DefaultValuePipe, Get, HttpCode, HttpStatus, ParseIntPipe, Query } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { RequirePermissions } from '@/decorator/permissions.decorator';
import { ResponseMessage } from '@/decorator/responseMessage.decorator';
import { PERMISSIONS } from '@/authorization/constants/permission';

@Controller('permissions')
export class PermissionsController {
    constructor(private readonly permissionsService: PermissionsService) { }

    @Get()
    @RequirePermissions(PERMISSIONS.PERMISSION_READ)
    @ResponseMessage('Lấy danh sách tất cả Permission thành công')
    @HttpCode(HttpStatus.OK)
    async findAllPaginate(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe)
        page: number,
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
        @Query('sortBy', new DefaultValuePipe('name')) sortBy: string,
        @Query('sortOrder', new DefaultValuePipe('desc')) sortOrder: 'asc' | 'desc',
        @Query('search', new DefaultValuePipe('')) search: string,
    ) {
        return this.permissionsService.findAllPaginate(page, limit, sortBy, sortOrder, search);
    }

    @Get('grouped')
    @RequirePermissions(PERMISSIONS.PERMISSION_READ)
    @ResponseMessage('Lấy danh sách Permission theo nhóm thành công')
    @HttpCode(HttpStatus.OK)
    async findAllGrouped() {
        return this.permissionsService.findAllGrouped();
    }

    @Get('all')
    @RequirePermissions(PERMISSIONS.PERMISSION_READ)
    @ResponseMessage('Lấy danh sách Permission thành công')
    @HttpCode(HttpStatus.OK)
    async findAll() {
        return this.permissionsService.findAll();
    }


}
