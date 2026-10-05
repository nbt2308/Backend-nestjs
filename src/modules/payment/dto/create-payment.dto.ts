import { IsInt, Min } from "class-validator";

export class CreatePaymentDto {
    @IsInt()
    @Min(1, { message: 'Mã đơn hàng không hợp lệ' })
    orderId!: number;
}
