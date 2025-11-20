import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import appConfig from './config/app.config';
import authConfig from './config/auth.config';
import cloudinaryConfig from './config/cloudinary.config';
import mailConfig from './config/mail.config';
import { PrismaModule } from './prisma/prisma.module';
import { UploadsModule } from './uploads/uploads.module';
import { AuthModule } from './auth/auth.module';
import { CustomersModule } from './customers/customers.module';
import { PredictionsModule } from './predictions/predictions.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { MlModule } from './ml/ml.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { UsersModule } from './users/users.module';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, authConfig, cloudinaryConfig, mailConfig],
    }),
    PrismaModule,
    UploadsModule,
    AuthModule,
    CustomersModule,
    PredictionsModule,
    CampaignsModule,
    MlModule,
    AnalyticsModule,
    UsersModule,
    EmailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
