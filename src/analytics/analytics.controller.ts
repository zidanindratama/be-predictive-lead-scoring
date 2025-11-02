import { Controller, Get, Query, UsePipes } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { Auth } from '../common/decorators/auth.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { TrendQueryDto, TrendQuerySchema } from './dtos/trend-query.dto';

@Controller('analytics')
@Auth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  async getOverview() {
    return this.analyticsService.getOverview();
  }

  @Get('trend')
  @UsePipes(new ZodValidationPipe(TrendQuerySchema))
  async getTrend(@Query() query: TrendQueryDto) {
    return this.analyticsService.getTrend(query.groupBy);
  }

  @Get('by-job')
  async getByJob() {
    return this.analyticsService.getByJob();
  }
}
