export const getForgotPasswordOTPEmailTemplate = (userName: string, otpCode: string): string => {
    return `
<!DOCTYPE html>
<html dir="ltr" lang="vi">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quên mật khẩu</title>
  </head>
  <body style="background-color:#f6f9fc; margin:0; padding:0;">
    <table border="0" width="100%" cellpadding="0" cellspacing="0" role="presentation" align="center" style="padding: 40px 20px;">
      <tbody>
        <tr>
          <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; font-size:1em; min-height:100%; line-height:155%;">
            
            <!-- Main Content Container -->
            <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px; width:100%; color:#1a1a1a; background-color:#ffffff; border-radius:8px; border:1px solid #eaeaea; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow:hidden;">
              <tbody>
                
                <!-- Header Area (Tùy chọn thêm Logo) -->
                <tr>
                  <td style="background-color:#000000; padding: 24px 40px; text-align: center;">
                    <h1 style="color:#ffffff; margin:0; font-size: 20px; font-weight: 600; letter-spacing: 1px;">QUÊN MẬT KHẨU</h1>
                  </td>
                </tr>

                <!-- Body Area -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin:0; padding:0; font-size:16px; padding-bottom:16px;">
                      Xin chào <strong>${userName}</strong>,
                    </p>
                    <p style="margin:0; padding:0; font-size:16px; padding-bottom:24px; color:#4a4a4a;">
                       Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản của mình. Vui lòng sử dụng mã OTP dưới đây để hoàn tất quá trình.
                    </p>

                    <!-- OTP Box -->
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td align="center" style="background-color:#f4f4f5; border-radius:8px; padding: 24px; border: 1px dashed #d4d4d8;">
                          <p style="margin:0; font-size: 32px; font-weight: 700; letter-spacing: 12px; color:#18181b;">
                            ${otpCode}
                          </p>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:0; padding:0; font-size:14px; padding-top:24px; color:#ef4444; text-align: center;">
                      <em>* Mã này sẽ tự động hết hạn sau <strong>${process.env.CODE_EXPIRED} phút</strong>.</em>
                    </p>

                    <hr style="border:none; border-top:1px solid #eaeaea; margin: 32px 0;" />

                    <p style="margin:0; padding:0; font-size:14px; color:#71717a;">
                      Nếu bạn không thực hiện yêu cầu này, vui lòng phớt lờ email này. Tài khoản của bạn vẫn được bảo mật an toàn.
                    </p>
                  </td>
                </tr>

                <!-- Footer Area -->
                <tr>
                  <td style="background-color:#fafafa; padding: 24px 40px; text-align: center; border-top: 1px solid #eaeaea;">
                    <p style="margin:0; font-size:12px; color:#a1a1aa;">
                      © 2026 Bản quyền thuộc về NevaGiveup.<br/>
                      Vui lòng không trả lời trực tiếp email này.
                    </p>
                  </td>
                </tr>

              </tbody>
            </table>

          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
  `;
};