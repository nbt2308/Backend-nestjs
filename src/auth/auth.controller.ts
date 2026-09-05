import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AdminLoginDto, CreateAuthDto, ResendOtpDto, ResetPasswordDto, SendForgotPasswordOTPDto, VerifyActivateOtpDto, VerifyResetPasswordOtpDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { AuthGuard } from '@nestjs/passport';
import { LocalAuthGuard } from './passport/local-auth.guard';
import { JwtAuthGuard } from './passport/jwt-auth.guard';
import { Public } from '@/decorator/public.decorator';
import { ResponseMessage } from '@/decorator/responseMessage.decorator';
import { OAuthDto } from './dto/oauth.dto';
import { LogoutDto } from './dto/logout.dto';
import { CurrentUser } from '@/decorator/current-user.decorator';
import type { AuthUser } from './interfaces/auth-user.interface';


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @UseGuards(LocalAuthGuard)
  @ResponseMessage('Đăng nhập thành công')
  @Public()
  @Post('login')
  async handleLogin(@Request() req) {
    return await this.authService.login(req.user);
  }

  @ResponseMessage('Đăng nhập thành công')
  @Public()
  @Post('admin-login')
  async handleAdminLogin(@Body() adminLoginDto: AdminLoginDto) {
    return await this.authService.adminLogin(adminLoginDto);
  }

  @Public()
  @ResponseMessage('Đăng ký thành công')
  @Post('register')
  async handleRegister(@Body() registerDTO: CreateAuthDto) {
    return await this.authService.register(registerDTO);
  }

  @Public()
  @ResponseMessage('Đăng nhập thành công')
  @Post('oauth')
  async handleOAuthLogin(@Body() oauthDTO: OAuthDto) {
    return await this.authService.oauthLogin(oauthDTO);
  }

  @Public()
  @Post('activate')
  @ResponseMessage('Xác thực OTP thành công')
  async handleVerifyOtp(@Body() verifyActivateOtpDto: VerifyActivateOtpDto) {
    return await this.authService.verifyActivateOtp(verifyActivateOtpDto);
  }

  @Public()
  @ResponseMessage('Gửi lại OTP thành công')
  @Post('resend-otp')
  async handleResendOtp(@Body() resendOtpDTO: ResendOtpDto) {
    return await this.authService.resendOtp(resendOtpDTO);
  }

  @Public()
  @ResponseMessage('Gửi OTP đặt lại mật khẩu thành công')
  @Post('send-reset-password-otp')
  async handleSendResetPasswordOtp(@Body() sendForgotPasswordOTPDto: SendForgotPasswordOTPDto) {
    return await this.authService.sendResetPasswordOtp(sendForgotPasswordOTPDto);
  }


  @Public()
  @ResponseMessage('Xác thực OTP đặt lại mật khẩu thành công')
  @Post('verify-reset-password-otp')
  async handleVerifyResetOtp(@Body() verifyResetPasswordOtpDto: VerifyResetPasswordOtpDto) {
    return await this.authService.verifyResetOtp(verifyResetPasswordOtpDto);
  }

  @Public()
  @ResponseMessage('Đặt lại mật khẩu thành công')
  @Post('reset-password')
  async handleResetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return await this.authService.resetPassword(resetPasswordDto);
  }

  @Public()
  @ResponseMessage('Refresh token thành công')
  @Post('refresh')
  async handleRefreshToken(@Body() body: { refreshToken: string }) {
    return await this.authService.refreshToken(body.refreshToken);
  }

  @Public()
  @ResponseMessage('Đăng xuất thành công')
  @Post('logout')
  async handleLogout(@Body() logoutDto: LogoutDto) {
    return await this.authService.logout(logoutDto.refreshToken);
  }

  @Get('me')
  getMe(@CurrentUser() user: AuthUser) {
    return this.authService.getMe(user.id);
  }

}
