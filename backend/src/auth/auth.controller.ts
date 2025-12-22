import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto, AuthResponseDto } from './dto';
import { JwtAuthGuard } from './guards';
import { CurrentUser as CurrentUserDecorator } from './decorators';
import { CurrentUser } from './interfaces/user.interface';

/**
 * 认证控制器
 * 处理认证相关的 HTTP 请求
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 用户注册
   * POST /api/v1/auth/register
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto): Promise<{
    success: boolean;
    data: AuthResponseDto;
    message: string;
  }> {
    const data = await this.authService.register(registerDto);
    return {
      success: true,
      data,
      message: '注册成功',
    };
  }

  /**
   * 用户登录
   * POST /api/v1/auth/login
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<{
    success: boolean;
    data: AuthResponseDto;
    message: string;
  }> {
    const data = await this.authService.login(loginDto);
    return {
      success: true,
      data,
      message: '登录成功',
    };
  }

  /**
   * 刷新 Token
   * POST /api/v1/auth/refresh
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto): Promise<{
    success: boolean;
    data: AuthResponseDto;
    message: string;
  }> {
    const data = await this.authService.refreshToken(refreshTokenDto.refreshToken);
    return {
      success: true,
      data,
      message: 'Token 刷新成功',
    };
  }

  /**
   * 获取当前用户信息
   * GET /api/v1/auth/me
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@CurrentUserDecorator() user: CurrentUser): Promise<{
    success: boolean;
    data: CurrentUser;
  }> {
    return {
      success: true,
      data: user,
    };
  }
}
