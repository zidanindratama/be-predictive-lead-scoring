import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UploadedFile,
  UseInterceptors,
  UsePipes,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { CustomersService } from './customers.service';
import { Auth } from '../common/decorators/auth.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('customers')
@Auth(RolesGuard)
export class CustomersController {
  constructor(private svc: CustomersService) {}

  @Post('import')
  @Roles('ADMIN', 'STAFF')
  @UseInterceptors(FileInterceptor('file'))
  import(@UploadedFile() file: Express.Multer.File) {
    return this.svc.importFile(file);
  }

  @Get('export.csv')
  @Roles('ADMIN', 'STAFF')
  async exportCsv(@Res() res: Response) {
    const { filename, contentType, data } = await this.svc.exportCsv();
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(data);
  }

  @Get('export.xlsx')
  @Roles('ADMIN', 'STAFF')
  async exportXlsx(@Res() res: Response) {
    const { filename, contentType, data } = await this.svc.exportXlsx();
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(data);
  }
}
