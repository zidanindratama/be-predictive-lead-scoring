import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildDateRange,
  ListParams,
  makeSearchWhere,
  meta,
  paginate,
  resolveSort,
} from '../common/utils/list.util';
import { UpdateUserDto } from './dtos/user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async list(query: ListParams) {
    const { page, take, skip } = paginate(query.page, query.limit);

    const allowedSort = ['createdAt', 'name', 'email', 'role'];
    const orderBy = resolveSort(
      query.sortBy,
      query.sortDir ?? 'desc',
      allowedSort,
      { createdAt: 'desc' },
    );

    const search = makeSearchWhere(query.q, ['name', 'email']);
    const createdAt = buildDateRange(query.from, query.to);
    const extraFilters: any = {};
    if (query.role) extraFilters.role = query.role;

    const where = {
      ...(search || {}),
      ...(createdAt ? { createdAt } : {}),
      ...extraFilters,
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, meta: meta(total, page, take) };
  }

  async detail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.role && { role: dto.role }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.delete({ where: { id } });
    return { message: 'User deleted successfully' };
  }
}
