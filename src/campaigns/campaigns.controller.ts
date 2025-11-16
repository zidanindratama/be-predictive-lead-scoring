import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Delete,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { Auth } from '../common/decorators/auth.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ListQueryDto, ListQuerySchema } from '../common/dto/list-query.dto';
import {
  CreateCampaignDto,
  CreateCampaignSchema,
  UpdateCampaignDto,
} from './dtos/campaign.dto';

@Controller('campaigns')
@Auth(RolesGuard)
export class CampaignsController {
  constructor(private svc: CampaignsService) {}

  @Post()
  @Roles('ADMIN', 'STAFF')
  @UsePipes(new ZodValidationPipe(CreateCampaignSchema))
  create(@Body() dto: CreateCampaignDto) {
    return this.svc.create(dto);
  }

  @Post(':id/run')
  @Roles('ADMIN', 'STAFF')
  run(@Param('id') id: string) {
    return this.svc.run(id);
  }

  @Get()
  @UsePipes(new ZodValidationPipe(ListQuerySchema))
  list(@Query() query: ListQueryDto) {
    return this.svc.list(query);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.svc.detail(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'STAFF')
  update(@Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
