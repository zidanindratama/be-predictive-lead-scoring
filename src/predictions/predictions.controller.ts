import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Param,
  Patch,
  Delete,
  UsePipes,
} from '@nestjs/common';
import { PredictionsService } from './predictions.service';
import { Auth } from '../common/decorators/auth.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  PredictionsListDto,
  PredictionsListSchema,
} from './dtos/list-query-prediction.dto';
import { UpdatePredictionDto } from './dtos/update-prediction.dto';

@Controller('predictions')
@Auth()
export class PredictionsController {
  constructor(private svc: PredictionsService) {}

  @Get()
  @UsePipes(new ZodValidationPipe(PredictionsListSchema))
  list(@Query() query: PredictionsListDto) {
    return this.svc.list(query);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.svc.detail(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePredictionDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }

  @Post('single')
  async predictSingle(@Body() dto: { customerId: string }) {
    return this.svc.predictSingle(dto.customerId);
  }
}
