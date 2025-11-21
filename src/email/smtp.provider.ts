import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export const SmtpProvider = {
  provide: 'SMTP',
  useFactory: (config: ConfigService) => {
    const transporter = nodemailer.createTransport({
      host: config.get<string>('mail.host'),
      port: config.get<number>('mail.port'),
      secure: true,
      auth: {
        user: config.get<string>('mail.user'),
        pass: config.get<string>('mail.pass'),
      },
    });
    return transporter;
  },
  inject: [ConfigService],
};
