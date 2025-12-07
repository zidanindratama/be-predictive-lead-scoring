import { Controller, Get } from '@nestjs/common';
import { MlService } from './ml.service';

@Controller('ml')
export class MlController {
  constructor(private readonly mlService: MlService) {}

  @Get('info')
  async getModelInfo() {
    return this.mlService.getModelInfo();
  }

  @Get('health')
  async healthCheck() {
    return this.mlService.health();
  }
}
