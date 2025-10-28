import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealthCheck() {
    return {
      status: 'ok',
      message: 'Predictive Lead Scoring API is running',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 5000,
    };
  }
}
