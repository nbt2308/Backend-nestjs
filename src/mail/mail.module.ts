import { Module, Global } from '@nestjs/common';
import { MailService } from './mail.service';

@Global() // Đánh dấu đây là module toàn cục
@Module({
    providers: [MailService],
    exports: [MailService],
})
export class MailModule { }