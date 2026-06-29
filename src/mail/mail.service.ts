import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Resend } from 'resend';
import { getVerifyEmailTemplate } from './templates/verfify-email.template';
import { ConfigService } from '@nestjs/config';
import { getForgotPasswordOTPEmailTemplate } from './templates/forgot-password.template';

@Injectable()
export class MailService {
    private resend: Resend;

    constructor() {
        // Khởi tạo Resend bằng API Key từ biến môi trường
        this.resend = new Resend(process.env.RESEND_API_KEY);
    }

    async sendVerifyEmail(userEmail: string, userName: string, otpCode: string) {
        try {
            const data = await this.resend.emails.send({
                from: process.env.MAIL_FROM || '',
                to: [userEmail],
                subject: `${otpCode} là mã xác thực tài khoản của bạn`,
                html: getVerifyEmailTemplate(userName, otpCode),
            });

            return data;
        } catch (error) {
            console.error('Lỗi khi gửi mail:', error);
            throw new InternalServerErrorException('Không thể gửi email lúc này');
        }
    }
    async sendForgotPasswordOTPEmail(userEmail: string, userName: string, otpCode: string) {
        try {
            const data = await this.resend.emails.send({
                from: process.env.MAIL_FROM || '',
                to: [userEmail],
                subject: `${otpCode} là mã đặt lại mật khẩu của bạn`,
                html: getForgotPasswordOTPEmailTemplate(userName, otpCode),
            });

            return data;
        } catch (error) {
            console.error('Lỗi khi gửi mail:', error);
            throw new InternalServerErrorException('Không thể gửi email lúc này');
        }
    }
}