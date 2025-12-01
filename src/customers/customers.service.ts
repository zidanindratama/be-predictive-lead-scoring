import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
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
import { MlService } from '../ml/ml.service';
import { MlMapper } from '../ml/ml.mapper';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    private prisma: PrismaService,
    private ml: MlService,
  ) {}

  private mapToPrisma(data: any) {
    const { default: creditDefault, ...rest } = data;
    return {
      ...rest,
      ...(creditDefault !== undefined && { creditDefault }),
    };
  }

  async importFile(file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is required');

    try {
      let rows: any[] = [];

      if (file.mimetype.includes('csv') || file.originalname.endsWith('.csv')) {
        const csv = file.buffer.toString('utf8');
        const parsed = Papa.parse(csv, { header: true, dynamicTyping: true });

        if (parsed.errors.length > 0) {
          console.error('CSV Parse Errors:', parsed.errors);
          throw new BadRequestException('Failed to parse CSV file');
        }

        rows = (parsed.data as any[]).filter((row) => row.name);
      } else {
        const wb = XLSX.read(file.buffer);
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(ws) as any[];
      }

      if (!rows.length) {
        throw new BadRequestException('No valid records found in the file');
      }

      this.logger.log(`Processing import for ${rows.length} customers...`);

      let successCount = 0;
      let predictionCount = 0;

      const results = await Promise.allSettled(
        rows.map(async (row) => {
          const prismaData = this.mapToPrisma(row);

          const customer = await this.prisma.customer.create({
            data: prismaData,
          });

          successCount++;

          try {
            const payload = MlMapper.toPredictionPayload(customer);
            const mlRes = await this.ml.predict(payload);

            if (mlRes && mlRes.success && mlRes.data) {
              await this.prisma.prediction.create({
                data: {
                  customerId: customer.id,
                  predictedClass: mlRes.data.predicted_class,
                  probabilityYes: mlRes.data.probability_yes,
                  probabilityNo: mlRes.data.probability_no,
                  source: 'import_auto_predict',
                },
              });
              predictionCount++;
            }
          } catch (mlError) {
            this.logger.warn(
              `Auto-prediction failed for customer ${customer.name}: ${mlError.message}`,
            );
          }

          return customer;
        }),
      );

      const failed = results.filter((r) => r.status === 'rejected').length;

      return {
        total_rows: rows.length,
        imported: successCount,
        predictions_generated: predictionCount,
        failed_rows: failed,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;

      this.logger.error('Import Error:', error);
      throw new InternalServerErrorException(
        'Failed to import customers data: ' + error.message,
      );
    }
  }

  async exportCsv() {
    try {
      const rows = await this.prisma.customer.findMany();
      const mappedRows = rows.map((r) => {
        const { creditDefault, ...rest } = r;
        return { ...rest, default: creditDefault };
      });
      const csv = Papa.unparse(mappedRows);
      return { filename: 'customers.csv', contentType: 'text/csv', data: csv };
    } catch (error) {
      throw new InternalServerErrorException('Failed to export CSV');
    }
  }

  async exportXlsx() {
    try {
      const rows = await this.prisma.customer.findMany();
      const mappedRows = rows.map((r) => {
        const { creditDefault, ...rest } = r;
        return { ...rest, default: creditDefault };
      });

      const ws = XLSX.utils.json_to_sheet(mappedRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'customers');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      return {
        filename: 'customers.xlsx',
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        data: buf,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to export Excel');
    }
  }

  async list(query: ListCustomersQueryDto) {
    try {
      const { page, take, skip } = paginate(query.page, query.limit);

      const where = this.buildWhere(query);

      const dateRange = buildDateRange(query.from, query.to);
      if (dateRange) where.createdAt = dateRange;

      const orderBy = resolveSort(
        query.sortBy,
        query.sortDir!,
        ['createdAt', 'name', 'age', 'job', 'marital', 'education', 'duration'],
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
    } catch (error) {
      console.error('List Error:', error);
      throw new InternalServerErrorException(
        'Failed to retrieve customers list',
      );
    }
  }

  async create(data: CreateCustomerDto) {
    try {
      const prismaData = this.mapToPrisma(data);
      const customer = await this.prisma.customer.create({ data: prismaData });

      try {
        const payload = MlMapper.toPredictionPayload(customer);
        const mlRes = await this.ml.predict(payload);
        if (mlRes?.success) {
          await this.prisma.prediction.create({
            data: {
              customerId: customer.id,
              predictedClass: mlRes.data.predicted_class,
              probabilityYes: mlRes.data.probability_yes,
              probabilityNo: mlRes.data.probability_no,
              source: 'create_auto_predict',
            },
          });
        }
      } catch (e) {}

      return customer;
    } catch (error) {
      console.error('Create Error:', error);
      throw new BadRequestException(
        'Failed to create customer. Check your input data.',
      );
    }
  }

  async findById(id: string) {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { id },
        include: { Prediction: { orderBy: { timestamp: 'desc' } } },
      });

      if (!customer) {
        throw new NotFoundException(`Customer with ID ${id} not found`);
      }

      return customer;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Invalid Customer ID format');
    }
  }

  async update(id: string, data: UpdateCustomerDto) {
    await this.findById(id);

    try {
      const prismaData = this.mapToPrisma(data);

      return await this.prisma.customer.update({
        where: { id },
        data: prismaData,
      });
    } catch (error) {
      console.error('Update Error:', error);
      throw new InternalServerErrorException('Failed to update customer');
    }
  }

  async delete(id: string) {
    const customer = await this.findById(id);

    try {
      await this.prisma.customer.delete({
        where: { id },
      });
      return customer;
    } catch (error) {
      console.error('Delete Error:', error);
      throw new InternalServerErrorException('Failed to delete customer');
    }
  }

  private buildWhere(query: Record<string, any>) {
    const where: any = {};

    const textFields = ['job', 'marital', 'education', 'contact'];
    for (const key of textFields) {
      if (query[key])
        where[key] = { contains: query[key], mode: 'insensitive' };
    }

    const searchWhere = makeSearchWhere(query.q, ['name', 'extId']);
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
