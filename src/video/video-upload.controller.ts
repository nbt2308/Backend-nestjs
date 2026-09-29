import { Controller, Post } from '@nestjs/common';
import { VideoUploadService } from './video-upload.service';

@Controller('video-upload')
export class VideoUploadController {
  constructor(
    private readonly videoUploadService: VideoUploadService,
  ) {}

//   @Post('test')
//   async test() {
//     return this.videoUploadService.addTestJob();
//   }
}