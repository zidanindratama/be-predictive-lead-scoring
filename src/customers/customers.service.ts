import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as Papa from 'papaparse';
import * as XLSX from 'xlsx';

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
}
