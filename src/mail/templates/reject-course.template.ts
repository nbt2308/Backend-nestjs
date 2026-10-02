export const getCourseRejectionEmailTemplate = (
instructorName: string,
courseTitle: string,
rejectionReason: string,
editCourseUrl: string
): string => {
return `

        <!-- Main Content Container -->
        <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px; width:100%; color:#1a1a1a; background-color:#ffffff; border-radius:8px; border:1px solid #eaeaea; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow:hidden;">
          <tbody>
            
            <!-- Header Area -->
            <tr>
              <td style="background-color:#000000; padding: 24px 40px; text-align: center;">
                <h1 style="color:#ffffff; margin:0; font-size: 18px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">
                  THÔNG BÁO KẾT QUẢ KIỂM DUYỆT KHÓA HỌC
                </h1>
              </td>
            </tr>

            <!-- Body Area -->
            <tr>
              <td style="padding: 40px;">
                <p style="margin:0; padding:0; font-size:16px; padding-bottom:16px;">
                  Xin chào <strong>${instructorName}</strong>,
                </p>
                <p style="margin:0; padding:0; font-size:16px; padding-bottom:20px; color:#4a4a4a; line-height: 1.6;">
                  Cảm ơn bạn đã đóng góp nội dung cho hệ thống. Sau khi tiến hành kiểm duyệt khóa học <strong>"${courseTitle}"</strong>, chúng tôi rất tiếc phải thông báo rằng khóa học hiện <strong>chưa đủ điều kiện để phê duyệt</strong>.
                </p>

                <!-- Rejection Reason Box -->
                <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom: 24px;">
                  <tr>
                    <td style="background-color:#fef2f2; border-radius:8px; padding: 20px; border: 1px solid #fecaca;">
                      <p style="margin:0 0 8px 0; font-size: 14px; font-weight: 700; color:#dc2626; text-transform: uppercase; letter-spacing: 0.5px;">
                        Lý do từ chối:
                      </p>
                      <p style="margin:0; font-size: 15px; color:#991b1b; line-height: 1.6; white-space: pre-line;">
                        ${rejectionReason}
                      </p>
                    </td>
                  </tr>
                </table>

                <p style="margin:0; padding:0; font-size:15px; padding-bottom:24px; color:#4a4a4a; line-height: 1.6;">
                  Vui lòng xem lại và cập nhật lại nội dung khóa học theo phản hồi trên để gửi lại yêu cầu phê duyệt.
                </p>

                <!-- CTA Button -->
                <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td align="center">
                      <a href="${editCourseUrl}" target="_blank" style="background-color:#18181b; color:#ffffff; display:inline-block; font-size:15px; font-weight:600; line-height:1; text-decoration:none; padding:14px 28px; border-radius:6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        Cập nhật khóa học
                      </a>
                    </td>
                  </tr>
                </table>

                <hr style="border:none; border-top:1px solid #eaeaea; margin: 32px 0;" />

                <p style="margin:0; padding:0; font-size:14px; color:#71717a; line-height: 1.5;">
                  Nếu bạn có bất kỳ thắc mắc nào liên quan đến kết quả kiểm duyệt, vui lòng liên hệ với bộ phận hỗ trợ giảng viên của chúng tôi.
                </p>
              </td>
            </tr>

            <!-- Footer Area -->
            <tr>
              <td style="background-color:#fafafa; padding: 24px 40px; text-align: center; border-top: 1px solid #eaeaea;">
                <p style="margin:0; font-size:12px; color:#a1a1aa; line-height: 1.5;">
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

`;
};

