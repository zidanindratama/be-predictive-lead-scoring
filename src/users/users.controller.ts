import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UsePipes,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Auth } from '../common/decorators/auth.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  UpdateUserDto,
  UpdateUserSchema,
  UserListQueryDto,
  UserListQuerySchema,
} from './dtos/user.dto';

@Controller('users')
@Auth(RolesGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(private svc: UsersService) {}

  @Get()
  @UsePipes(new ZodValidationPipe(UserListQuerySchema))
  list(@Query() query: UserListQueryDto) {
    return this.svc.list(query);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.svc.detail(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateUserSchema)) dto: UpdateUserDto,
  ) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
