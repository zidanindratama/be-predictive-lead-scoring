import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import appConfig from './config/app.config';
import authConfig from './config/auth.config';
import cloudinaryConfig from './config/cloudinary.config';
import { PrismaModule } from './prisma/prisma.module';
import { UploadsModule } from './uploads/uploads.module';
import { AuthModule } from './auth/auth.module';
import { CustomersModule } from './customers/customers.module';
import { PredictionsModule } from './predictions/predictions.module';
import { MlModule } from './ml/ml.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, authConfig, cloudinaryConfig],
    }),
    PrismaModule,
    UploadsModule,
    AuthModule,
    CustomersModule,
    PredictionsModule,
    MlModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
