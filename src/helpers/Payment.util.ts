import { PrismaService } from "@/prisma/prisma.service";
import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import * as crypto from 'crypto';
export const generateOrderNumber = (): string => {
    const timestamp = Date.now();
    const random = Math.floor(1000 + Math.random() * 9000);

    return `NEVA-ORDER-${timestamp}-${random}`;
}

export const generatePaymentCode = async (prisma: PrismaService): Promise<string> =>{
    let paymentCode: string;

    do {
        paymentCode = `NEVA${Date.now()}${Math.floor(
            1000 + Math.random() * 9000,
        )}`;

        const existing =
            await prisma.payment.findUnique({
                where: {
                    paymentCode,
                },
            });

        if (!existing) {
            return paymentCode;
        }
    } while (true);
}

export const generateQrCodeUrl = ( paymentCode: string,amount: Prisma.Decimal,config: { account: string; bank: string },): string => {
  const {account, bank} = config

  if (!account || !bank) {
    throw new Error(
      'SePay bank configuration is missing',
    );
  }

  const params = new URLSearchParams({
    acc: account,
    bank,
    amount: amount.toFixed(0),
    des: paymentCode,
    template: 'compact',
  });

  return `https://vietqr.app/img?${params.toString()}`;
}

export const verifySePaySignature =(
  rawBody: Buffer | undefined,
  signature: string | undefined,
  timestamp: string | undefined,
  secret: string,
) =>{
  if (!secret) {
    throw new Error('SEPAY_WEBHOOK_SECRET is missing');
  }

  if (!rawBody || !signature || !timestamp) {
    throw new UnauthorizedException('Invalid SePay webhook signature');
  }

  const payload =`${timestamp}.${rawBody.toString('utf8')}`;

  const expectedSignature =
    crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

  const expected =`sha256=${expectedSignature}`;

  const isValid =signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected),);

  if (!isValid) {
    throw new UnauthorizedException('Invalid SePay webhook signature');
  }
}

export const parseSePayDate=(
  value: string,
): Date => {
  return new Date(
    value.replace(' ', 'T') + '+07:00',
  );
}