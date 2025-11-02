import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MlService } from '../ml/ml.service';
import {
  buildDateRange,
  ListParams,
  makeSearchWhere,
  meta,
  paginate,
  resolveSort,
} from 'src/common/utils/list.util';
import { CreateCampaignDto, UpdateCampaignDto } from './dtos/campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(
    private prisma: PrismaService,
    private ml: MlService,
  ) {}

  create(dto: CreateCampaignDto) {
    return this.prisma.campaign.create({
      data: {
        name: dto.name,
        criteria: dto.criteria ?? {},
        totalTargets: 0,
        yesCount: 0,
        noCount: 0,
      },
    });
  }

  async list(query: ListParams) {
    const { page, take, skip } = paginate(query.page, query.limit);

    const allowedSort = [
      'createdAt',
      'name',
      'yesCount',
      'noCount',
      'totalTargets',
    ];
    const orderBy = resolveSort(
      query.sortBy,
      query.sortDir ?? 'desc',
      allowedSort,
      { createdAt: 'desc' },
    );

    const search = makeSearchWhere(query.q, ['name']);
    const createdAt = buildDateRange(query.from, query.to);
    const extraFilters: any = {};
    if (query.createdById) extraFilters.createdById = query.createdById;

    const where = {
      ...(search || {}),
      ...(createdAt ? { createdAt } : {}),
      ...extraFilters,
    };

    const [items, total] = await Promise.all([
      this.prisma.campaign.findMany({ where, skip, take, orderBy }),
      this.prisma.campaign.count({ where }),
    ]);

    return { items, meta: meta(total, page, take) };
  }

  async detail(id: string) {
    const c = await this.prisma.campaign.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Campaign not found');
    return c;
  }

  async run(id: string) {
    const camp = await this.prisma.campaign.findUnique({ where: { id } });
    if (!camp) throw new NotFoundException('Campaign not found');

    const where: any = camp.criteria || {};
    const targets = await this.prisma.customer.findMany({ where });
    let yes = 0,
      no = 0;

    for (const c of targets) {
      const payload = {
        age: c.age,
        job: c.job,
        marital: c.marital,
        education: c.education,
        default: 'no',
        housing: c.housing,
        loan: c.loan,
        contact: c.contact,
        month: c.month,
        day_of_week: c.day_of_week,
        duration: 0,
        campaign: c.campaign,
        pdays: c.pdays,
        previous: c.previous,
        poutcome: c.poutcome,
        emp_var_rate: c.emp_var_rate,
        cons_price_idx: c.cons_price_idx,
        cons_conf_idx: c.cons_conf_idx,
        euribor3m: c.euribor3m,
        nr_employed: c.nr_employed,
      };

      const res = await this.ml.predict(payload);
      const klass = res?.data?.predicted_class ?? 'NO';
      yes += klass === 'YES' ? 1 : 0;
      no += klass === 'NO' ? 1 : 0;

      await this.prisma.prediction.create({
        data: {
          customerId: c.id,
          predictedClass: klass,
          probabilityYes: res?.data?.probability_yes ?? 0,
          probabilityNo: res?.data?.probability_no ?? 1,
          source: `campaign:${id}`,
        },
      });
    }

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: { totalTargets: targets.length, yesCount: yes, noCount: no },
    });

    return {
      campaign: updated,
      rate: targets.length ? yes / targets.length : 0,
    };
  }

  async update(id: string, dto: UpdateCampaignDto) {
    const existing = await this.prisma.campaign.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Campaign not found');

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.criteria ? { criteria: dto.criteria } : {}),
      },
    });

    if (dto.recompute !== false) {
      await this.recomputeCounters(updated.id);
    }

    return this.prisma.campaign.findUnique({ where: { id } });
  }

  async remove(id: string) {
    const existing = await this.prisma.campaign.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Campaign not found');

    await this.prisma.prediction.deleteMany({
      where: { source: `campaign:${id}` },
    });

    await this.prisma.campaign.delete({ where: { id } });
    return { ok: true };
  }

  private async recomputeCounters(campaignId: string) {
    const camp = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!camp) throw new NotFoundException('Campaign not found');

    const where: any = camp.criteria || {};
    const targets = await this.prisma.customer.findMany({ where });
    const targetIds = targets.map((t) => t.id);

    let yes = 0,
      no = 0;
    if (targetIds.length) {
      const preds = await this.prisma.prediction.findMany({
        where: { customerId: { in: targetIds } },
        select: { predictedClass: true },
      });
      yes = preds.filter((p) => p.predictedClass === 'YES').length;
      no = preds.filter((p) => p.predictedClass === 'NO').length;
    }

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        totalTargets: targetIds.length,
        yesCount: yes,
        noCount: no,
      },
    });
  }
}
