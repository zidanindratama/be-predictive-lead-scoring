import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MlService } from '../ml/ml.service';
import {
  ListParams,
  buildDateRange,
  resolveSort,
  paginate,
  meta,
} from '../common/utils/list.util';
import { UpdatePredictionDto } from './dtos/update-prediction.dto';

@Injectable()
export class PredictionsService {
  constructor(
    private prisma: PrismaService,
    private ml: MlService,
  ) {}

  async list(query: ListParams) {
    const { page, take, skip } = paginate(query.page, query.limit);

    const allowedSort = [
      'timestamp',
      'predictedClass',
      'probabilityYes',
      'probabilityNo',
    ];
    const orderBy = resolveSort(
      query.sortBy,
      (query.sortDir as 'asc' | 'desc') ?? 'desc',
      allowedSort,
      { timestamp: 'desc' },
    );

    const ts = buildDateRange(query.from, query.to);

    const where: any = {};
    if (ts) where.timestamp = ts;
    if (query.predictedClass) where.predictedClass = query.predictedClass;
    if (query.customerId) where.customerId = query.customerId;
    if (query.source) where.source = query.source;

    if (query.probYesMin || query.probYesMax) {
      where.probabilityYes = {};
      if (query.probYesMin) where.probabilityYes.gte = Number(query.probYesMin);
      if (query.probYesMax) where.probabilityYes.lte = Number(query.probYesMax);
    }
    if (query.probNoMin || query.probNoMax) {
      where.probabilityNo = {};
      if (query.probNoMin) where.probabilityNo.gte = Number(query.probNoMin);
      if (query.probNoMax) where.probabilityNo.lte = Number(query.probNoMax);
    }

    if (query.q) {
      where.OR = [
        { customer: { name: { contains: query.q, mode: 'insensitive' } } },
        { customer: { job: { contains: query.q, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.prediction.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              job: true,
              marital: true,
              age: true,
            },
          },
        },
      }),
      this.prisma.prediction.count({ where }),
    ]);

    return { items, meta: meta(total, page, take) };
  }

  async detail(id: string) {
    const p = await this.prisma.prediction.findUnique({
      where: { id },
      include: {
        customer: {
          select: { id: true, name: true, job: true, marital: true, age: true },
        },
      },
    });
    if (!p) throw new NotFoundException('Prediction not found');
    return p;
  }

  async update(id: string, dto: UpdatePredictionDto) {
    const existing = await this.prisma.prediction.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Prediction not found');

    const { probabilityYes, probabilityNo } = this.normalizeProbs(
      dto.probabilityYes,
      dto.probabilityNo,
      dto.predictedClass ?? (existing.predictedClass as 'YES' | 'NO'),
    );

    const newClass =
      dto.predictedClass ??
      (probabilityYes !== undefined && probabilityNo !== undefined
        ? probabilityYes >= probabilityNo
          ? 'YES'
          : 'NO'
        : undefined);

    const payload: any = {
      ...(dto.source ? { source: dto.source } : {}),
      ...(dto.timestamp ? { timestamp: dto.timestamp } : {}),
      ...(newClass ? { predictedClass: newClass } : {}),
      ...(probabilityYes !== undefined ? { probabilityYes } : {}),
      ...(probabilityNo !== undefined ? { probabilityNo } : {}),
    };

    if (!Object.keys(payload).length) {
      throw new BadRequestException('No valid fields to update');
    }

    return this.prisma.prediction.update({
      where: { id },
      data: payload,
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.prediction.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Prediction not found');
    await this.prisma.prediction.delete({ where: { id } });
    return { ok: true };
  }

  async predictSingle(customerId: string) {
    const cust = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!cust) throw new NotFoundException('Customer not found');

    const payload = {
      age: cust.age,
      job: cust.job,
      marital: cust.marital,
      education: cust.education,
      default: 'no',
      housing: cust.housing,
      loan: cust.loan,
      contact: cust.contact,
      month: cust.month,
      day_of_week: cust.day_of_week,
      duration: 0,
      campaign: cust.campaign,
      pdays: cust.pdays,
      previous: cust.previous,
      poutcome: cust.poutcome,
      emp_var_rate: cust.emp_var_rate,
      cons_price_idx: cust.cons_price_idx,
      cons_conf_idx: cust.cons_conf_idx,
      euribor3m: cust.euribor3m,
      nr_employed: cust.nr_employed,
    };

    const res = await this.ml.predict(payload);
    const saved = await this.prisma.prediction.create({
      data: {
        customerId,
        predictedClass: res?.data?.predicted_class ?? 'NO',
        probabilityYes: res?.data?.probability_yes ?? 0,
        probabilityNo: res?.data?.probability_no ?? 1,
        source: 'single',
      },
    });
    return saved;
  }

  private normalizeProbs(
    py?: number,
    pn?: number,
    _klass?: 'YES' | 'NO',
  ): { probabilityYes?: number; probabilityNo?: number } {
    const inRange = (v: number) => v >= 0 && v <= 1;

    if (py === undefined && pn === undefined) return {};

    if (py !== undefined && !inRange(py)) {
      throw new BadRequestException('probabilityYes must be between 0 and 1');
    }
    if (pn !== undefined && !inRange(pn)) {
      throw new BadRequestException('probabilityNo must be between 0 and 1');
    }

    if (py !== undefined && pn !== undefined) {
      const sum = py + pn;
      if (Math.abs(sum - 1) > 0.05) {
        const y = py / sum;
        const n = pn / sum;
        return { probabilityYes: +y.toFixed(3), probabilityNo: +n.toFixed(3) };
      }
      return { probabilityYes: +py.toFixed(3), probabilityNo: +pn.toFixed(3) };
    }

    if (py !== undefined) {
      return {
        probabilityYes: +py.toFixed(3),
        probabilityNo: +(1 - py).toFixed(3),
      };
    }
    if (pn !== undefined) {
      return {
        probabilityNo: +pn.toFixed(3),
        probabilityYes: +(1 - pn).toFixed(3),
      };
    }

    return {};
  }
}
