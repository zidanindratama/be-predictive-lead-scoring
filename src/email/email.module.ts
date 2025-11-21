import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { SmtpProvider } from './smtp.provider';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [EmailService, SmtpProvider],
  exports: [EmailService],
})
export class EmailModule {}
