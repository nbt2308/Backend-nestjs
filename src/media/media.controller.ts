
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { MediaService } from './media.service';
import { RequirePermissions } from '@/decorator/permissions.decorator';
import { PERMISSIONS } from '@/authorization/constants/permission';

@Controller('media')
export class MediaController {
    constructor(private readonly mediaService: MediaService) { }

    @Get('signature')
    @RequirePermissions(PERMISSIONS.MEDIA_UPLOAD)
    async getSignature(@Query('folder') folder: string = 'general') {
        return await this.mediaService.getUploadSignature(folder);
    }
}