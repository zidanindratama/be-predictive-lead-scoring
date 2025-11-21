import { Injectable, Inject, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join } from 'path';

interface ISendEmailOptions {
  to: string;
  subject: string;
  templateName: string;
  context: Record<string, any>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(@Inject('SMTP') private transporter: nodemailer.Transporter) {}

  private getTemplate(templateName: string): string {
    const templatePath = join(
      __dirname,
      '../assets/templates',
      `${templateName}.hbs`,
    );
    return readFileSync(templatePath, 'utf8');
  }

  private compileTemplate(template: string, data: any): string {
    const compiledTemplate = handlebars.compile(template);
    return compiledTemplate(data);
  }

  async sendEmail(options: ISendEmailOptions): Promise<void> {
    try {
      const { to, subject, templateName, context } = options;

      const template = this.getTemplate(templateName);
      const htmlContent = this.compileTemplate(template, context);

      const mailOptions = {
        from: process.env.MAIL_FROM,
        to: to,
        subject: subject,
        html: htmlContent,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent to ${to} with subject: ${subject}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${options.to}: ${error.message}`,
      );
      throw new Error('Failed to send email');
    }
  }
}
