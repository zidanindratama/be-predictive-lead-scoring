import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

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
}
