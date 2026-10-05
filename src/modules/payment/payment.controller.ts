import { Controller, Get, Post, Body, Patch, Param, Delete, Req, Headers } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { CurrentUser } from '@/decorator/current-user.decorator';
import type { AuthUser } from '@/auth/interfaces/auth-user.interface';
import { SePayWebhookDto } from './dto/sepay-webhook.dto';
import { Request } from 'express';
import { Public } from '@/decorator/public.decorator';
import { ResponseMessage } from '@/decorator/responseMessage.decorator';
import { SkipTransform } from '@/core/transform.interceptor';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) { }

  @Post()
  @ResponseMessage(" Tạo đơn hàng thành công")
  async create(@CurrentUser() user: AuthUser, @Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentService.createPayment(user.id, createPaymentDto);
  }

  @Public()
  @Post('webhook/sepay')
  @SkipTransform()
  async handleSePayWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Body() body: SePayWebhookDto,
    @Headers('x-sepay-signature') signature?: string,
    @Headers('x-sepay-timestamp') timestamp?: string,
  ) {
    await this.paymentService.handleSePayWebhook(body,req.rawBody,signature,timestamp);

    return {
      success: true,
    };
  }

  @Get()
  findAll() {
    return this.paymentService.findAll();
  }

  @Get(':orderNumber')
  @ResponseMessage("Lấy thông tin thanh toán thành công")
  findOne(@CurrentUser() user: AuthUser, @Param('orderNumber') orderNumber: string) {
    return this.paymentService.findOne(user.id, orderNumber);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePaymentDto: UpdatePaymentDto) {
    return this.paymentService.update(+id, updatePaymentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.paymentService.remove(+id);
  }
}
