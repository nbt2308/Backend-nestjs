import { Controller, Get } from '@nestjs/common';
import { HomeService } from './home.service';
import { Public } from '@/decorator/public.decorator';
@Controller('home')
export class HomeController {
    constructor(private readonly homeService: HomeService) { }

    @Get()
    @Public()
    async getHomeData() {
        return await this.homeService.getHomeData();
    }
}