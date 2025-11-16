import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { Response } from 'express';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';
import { Auth } from '../common/decorators/auth.decorator';
import { JwtRefreshGuard } from '../common/guards/jwt-refresh.guard';
import { LoginSchema } from './dtos/login.dto';
import { RegisterSchema } from './dtos/register.dto';
import { UpdateProfileSchema } from './dtos/update-profile.dto';

const cookieBase = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.COOKIE_SECURE === 'true',
  domain: process.env.COOKIE_DOMAIN || undefined,
  path: '/',
};

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  @UsePipes(new ZodValidationPipe(RegisterSchema))
  async register(@Body() dto: any, @Res({ passthrough: true }) res: Response) {
    const { user, tokens } = await this.auth.register(dto);
    res.cookie('rt', tokens.rt, {
      ...cookieBase,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
    return { user, accessToken: tokens.at };
  }

  @Post('login')
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(LoginSchema))
  async login(@Body() dto: any, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.validateUser(dto.email, dto.password);
    const tokens = this.auth.signTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });
    res.cookie('rt', tokens.rt, {
      ...cookieBase,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
    return { user, accessToken: tokens.at };
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  async refresh(@Req() req, @Res({ passthrough: true }) res: Response) {
    const payload = req.user;
    const tokens = this.auth.signTokens({
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      name: payload.name,
    });
    res.cookie('rt', tokens.rt, {
      ...cookieBase,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
    return { accessToken: tokens.at };
  }

  @Delete('logout')
  @HttpCode(200)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('rt', { ...cookieBase });
    return { ok: true };
  }

  @Get('me')
  @Auth()
  me(@Req() req) {
    return this.auth.getMe(req.user.sub);
  }

  @Patch('me')
  @Auth()
  @UsePipes(new ZodValidationPipe(UpdateProfileSchema))
  async updateMe(@Req() req, @Body() dto: any) {
    return this.auth.updateMe(req.user.sub, dto);
  }
}
