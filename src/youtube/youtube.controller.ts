import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Res, Redirect } from '@nestjs/common';
import { YoutubeService } from './youtube.service';
import type { Response } from 'express';


@Controller('youtube')
export class YoutubeController {
    constructor(private readonly youtubeService: YoutubeService) { }

    @Post('get-youtube-info')
    async getYoutubeInfo(@Body('videoUrl') videoUrl: string) {
        return this.youtubeService.getVideoDetails(videoUrl);
    }

    @Get('oauth/callback')
    async oauthCallback(
        @Query('code') code: string,
    ) {
        return this.youtubeService.handleOAuthCallback(code);
    }

    @Get('oauth')
    @Redirect()
    connectYoutube(@Res() res: Response) {
        const url = this.youtubeService.getAuthUrl();

        res.redirect(url);
    }

    @Get('channel')
    async getChannel() {
        return this.youtubeService.getChannelInfo();
    }

}
