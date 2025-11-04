import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  ListCustomersQueryDto,
} from './dtos/customer.dto';
import {
  makeSearchWhere,
  buildDateRange,
  resolveSort,
  paginate,
  meta,
} from '../common/utils/list.util';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async importFile(file: Express.Multer.File) {
    if (!file) throw new Error('File required');

    if (file.mimetype.includes('csv')) {
      const csv = file.buffer.toString('utf8');
      const parsed = Papa.parse(csv, { header: true });
      const rows = (parsed.data as any[]).filter(Boolean);
      if (!rows.length) return { imported: 0 };
      await this.prisma.customer.createMany({ data: rows });
      return { imported: rows.length };
    } else {
      const wb = XLSX.read(file.buffer);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = (XLSX.utils.sheet_to_json(ws) as any[]).filter(Boolean);
      if (!rows.length) return { imported: 0 };
      await this.prisma.customer.createMany({ data: rows });
      return { imported: rows.length };
    }
  }

  async exportCsv() {
    const rows = await this.prisma.customer.findMany();
    const csv = Papa.unparse(rows);
    return { filename: 'customers.csv', contentType: 'text/csv', data: csv };
  }

  async exportXlsx() {
    const rows = await this.prisma.customer.findMany();
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'customers');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return {
      filename: 'customers.xlsx',
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      data: buf,
    };
  }

  async list(query: ListCustomersQueryDto) {
    const { page, take, skip } = paginate(query.page, query.limit);

    const where = this.buildWhere(query);

    const dateRange = buildDateRange(query.from, query.to);
    if (dateRange) where.createdAt = dateRange;

    const orderBy = resolveSort(
      query.sortBy,
      query.sortDir!,
      ['createdAt', 'name', 'age', 'job', 'marital', 'education'],
      { createdAt: 'desc' },
    );

    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy,
        skip,
        take,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      items,
      meta: meta(total, page, take),
    };
  }

  async create(data: CreateCustomerDto) {
    return this.prisma.customer.create({ data });
  }

  async findById(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async update(id: string, data: UpdateCustomerDto) {
    await this.findById(id);

    return this.prisma.customer.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    const customer = await this.findById(id);

    await this.prisma.customer.delete({
      where: { id },
    });

    return customer;
  }

  private buildWhere(query: Record<string, any>) {
    const where: any = {};

    const textFields = ['job', 'marital', 'education', 'contact'];
    for (const key of textFields) {
      if (query[key])
        where[key] = { contains: query[key], mode: 'insensitive' };
    }

    const searchWhere = makeSearchWhere(query.q, [
      'name',
      'extId',
      ...textFields,
    ]);
    if (searchWhere) {
      Object.assign(where, searchWhere);
    }

    if (query.ageMin || query.ageMax) {
      where.age = {};
      if (query.ageMin) where.age.gte = query.ageMin;
      if (query.ageMax) where.age.lte = query.ageMax;
    }

    return where;
  }
}
