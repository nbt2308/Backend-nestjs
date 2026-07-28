
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
    constructor(private readonly mediaService: MediaService) { }

    @Get('signature')
    async getSignature(@Query('folder') folder: string = 'general') {
        return await this.mediaService.getUploadSignature(folder);
    }
}