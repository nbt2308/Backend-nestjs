import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class AuthCronService {
  private readonly logger = new Logger(AuthCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Chạy tự động lúc 03:00 AM mỗi ngày (Hàng đêm)
   * Xóa tất cả các Refresh Token:
   * 1. Đã hết hạn (expiresAt < hiện tại)
   * 2. Hoặc đã bị thu hồi (revokedAt) hơn 1 ngày
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCleanExpiredTokens() {
    this.logger.log('Bắt đầu dọn dẹp Refresh Token đã hết hạn / bị thu hồi...');

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
      const deleteResult = await this.prisma.refreshToken.deleteMany({
        where: {
          OR: [
            // Trường hợp 1: Token đã hết hạn
            { expiresAt: { lt: new Date() } },
            // Trường hợp 2: Token đã thu hồi (revoked) quá 1 ngày
            {
              revokedAt: {
                not: null,
                lt: oneDayAgo,
              },
            },
          ],
        },
      });

      this.logger.log(`Dọn dẹp hoàn tất: Đã xóa ${deleteResult.count} refresh token rác.`);
    } catch (error) {
      this.logger.error('Lỗi trong quá trình dọn dẹp refresh token:', error);
    }
  }
}