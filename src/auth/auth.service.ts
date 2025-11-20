import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';

type JwtClaims = {
  sub: string;
  role: 'ADMIN' | 'STAFF' | 'USER';
  email: string;
  name: string;
};

type MsString = `${number}${'s' | 'm' | 'h' | 'd'}`;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private emailService: EmailService,
  ) {}

  async register(dto: any) {
    const hashed = await bcrypt.hash(dto.password, 10);
    const created = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashed,
        name: dto.name,
        role: dto.role ?? 'USER',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    const tokens = this.signTokens({
      id: created.id,
      email: created.email,
      role: created.role,
      name: created.name,
    });

    try {
      await this.emailService.sendEmail({
        to: created.email,
        subject: 'Welcome to SmartBank - Your Account is Ready!',
        templateName: 'welcome-user',
        context: {
          name: created.name,
          actionUrl: '/',
        },
      });
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }

    return { user: created, tokens };
  }

  async validateUser(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    const ok = await bcrypt.compare(pass, user.password);
    if (!ok) return null;
    const { password, ...safe } = user as any;
    return safe;
  }

  signTokens(u: { id: string; email: string; role: any; name: string }) {
    const payload: JwtClaims = {
      sub: u.id,
      email: u.email,
      role: u.role,
      name: u.name,
    };
    const accessSecret = this.config.get<string>('auth.accessSecret')!;
    const refreshSecret = this.config.get<string>('auth.refreshSecret')!;
    const accessTtl = (this.config.get<string>('auth.accessTtl') ??
      '15m') as MsString;
    const refreshTtl = (this.config.get<string>('auth.refreshTtl') ??
      '7d') as MsString;
    const at = this.jwt.sign(payload, {
      secret: accessSecret,
      expiresIn: accessTtl,
    });
    const rt = this.jwt.sign(payload, {
      secret: refreshSecret,
      expiresIn: refreshTtl,
    });
    return { at, rt };
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateMe(userId: string, dto: any) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { ...dto },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        updatedAt: true,
      },
    });
  }

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async requestForgotPassword(
    dto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    const { email } = dto;

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return { message: 'If your email is registered, we have sent an OTP' };
    }

    const code = this.generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.prisma.otp.upsert({
      where: {
        identifier_purpose: {
          identifier: user.email,
          purpose: 'PASSWORD_RESET',
        },
      },
      create: {
        identifier: user.email,
        code: code,
        purpose: 'PASSWORD_RESET',
        expiresAt,
      },
      update: {
        code: code,
        expiresAt,
        createdAt: new Date(),
      },
    });

    try {
      await this.emailService.sendEmail({
        to: user.email,
        subject: 'Reset Password Request - SmartBank',
        templateName: 'forgot-password',
        context: {
          name: user.name,
          otp: code,
          actionUrl: '/auth/reset-password',
        },
      });
    } catch (error) {
      console.error('Failed to send email:', error);
    }

    return { message: 'If your email is registered, we have sent an OTP' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const { email, otp, newPassword } = dto;

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (!user) {
        throw new BadRequestException('Invalid credentials');
      }

      const otpRecord = await tx.otp.findUnique({
        where: {
          identifier_purpose: {
            identifier: email,
            purpose: 'PASSWORD_RESET',
          },
        },
      });

      if (!otpRecord) {
        throw new BadRequestException('Invalid or expired OTP');
      }

      if (otpRecord.code !== otp || otpRecord.expiresAt < new Date()) {
        throw new BadRequestException('Invalid or expired OTP');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await tx.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      await tx.otp.delete({
        where: {
          identifier_purpose: {
            identifier: email,
            purpose: 'PASSWORD_RESET',
          },
        },
      });

      return { message: 'Password updated successfully' };
    });
  }
}
