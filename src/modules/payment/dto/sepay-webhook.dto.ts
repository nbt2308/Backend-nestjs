//dto lay tu sepay
import { IsIn, IsInt, IsNumber, IsOptional, IsString } from "class-validator";

export class SePayWebhookDto {
  @IsInt()
  id!: number; //ID giao dịch trên SePay. Giá trị này không đổi qua mọi lần retry và replay, dùng làm khóa chống trùng.
  @IsString()
  gateway!: string; //Tên ngân hàng của giao dịch (ví dụ Vietcombank, BIDV, TPBank).
  @IsString()
  transactionDate!: string; //Định dạng YYYY-MM-DD HH:mm:ss, giờ Việt Nam.
  @IsString()
  accountNumber!: string; //Số tài khoản ngân hàng.
  @IsString()
  @IsOptional()
  subAccount?: string; //VA khớp giao dịch. VA chính thức: số VA khách chuyển vào. TKP (VA nội dung): mã định danh trong nội dung chuyển khoản. Rỗng "" nếu không khớp.
  @IsString()
  @IsOptional()
  code?: string | null; //Mã thanh toán (ví dụ DH123456)
  @IsString()
  content!: string; // 	Nội dung chuyển khoản gốc từ ngân hàng, SePay không qua xử lý.
  @IsIn(['in', 'out'])
  transferType!: 'in' | 'out'; //in (tiền vào) hoặc out (tiền ra).
  @IsString()
  @IsOptional()
  description?: string; //Mô tả đầy đủ từ ngân hàng. Một số ngân hàng không hỗ trợ, khi đó rỗng.
  @IsNumber()
  transferAmount!: number; //Số tiền giao dịch, đơn vị VNĐ, luôn dương.
  @IsNumber()
  @IsOptional()
  accumulated?: number; // Số dư sau giao dịch. Một số ngân hàng không hỗ trợ trả số dư, khi đó là 0.
  @IsString()
  @IsOptional()
  referenceCode?: string; //Mã tham chiếu từ ngân hàng.
}