import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MlService } from '../ml/ml.service';
import { MlMapper } from '../ml/ml.mapper';
import {
  buildDateRange,
  ListParams,
  makeSearchWhere,
  meta,
  paginate,
  resolveSort,
} from '../common/utils/list.util';
import { CreateCampaignDto, UpdateCampaignDto } from './dtos/campaign.dto';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

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

  async getCampaignTargets(campaignId: string, query: ListParams) {
    const camp = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, name: true },
    });
    if (!camp) throw new NotFoundException('Campaign not found');

    const { page, take, skip } = paginate(query.page, query.limit);

    const where: any = {
      source: `campaign:${campaignId}`,
    };

    if (query.q) {
      where.customer = {
        name: { contains: query.q, mode: 'insensitive' },
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.prediction.findMany({
        where,
        skip,
        take,
        orderBy: [{ probabilityYes: 'desc' }],
        include: {
          customer: {
            select: {
              id: true,
              extId: true,
              name: true,
              job: true,
              age: true,
              contact: true,
              marital: true,
              education: true,
            },
          },
        },
      }),
      this.prisma.prediction.count({ where }),
    ]);

    return {
      campaign: camp,
      items,
      meta: meta(total, page, take),
    };
  }

  async run(id: string) {
    const camp = await this.prisma.campaign.findUnique({ where: { id } });
    if (!camp) throw new NotFoundException('Campaign not found');

    const where: any = camp.criteria || {};
    const targets = await this.prisma.customer.findMany({ where });

    this.logger.log(
      `Starting Campaign "${camp.name}" with ${targets.length} targets.`,
    );

    let yes = 0,
      no = 0;

    for (const c of targets) {
      try {
        const payload = MlMapper.toPredictionPayload(c);

        const res = await this.ml.predict(payload);

        if (!res || !res.success || !res.data) {
          this.logger.warn(`Invalid ML response for ${c.name}`);
          continue;
        }

        const klass = res.data.predicted_class;
        const probYes = res.data.probability_yes;

        console.log(
          `[PREDICT] ${c.name} | Result: ${klass} (${(probYes * 100).toFixed(1)}%)`,
        );

        yes += klass === 'YES' ? 1 : 0;
        no += klass === 'NO' ? 1 : 0;

        await this.prisma.prediction.create({
          data: {
            customerId: c.id,
            predictedClass: klass,
            probabilityYes: res.data.probability_yes,
            probabilityNo: res.data.probability_no,
            source: `campaign:${id}`,
          },
        });
      } catch (error) {
        this.logger.error(`Failed to predict for ${c.name}: ${error.message}`);
      }
    }

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: { totalTargets: targets.length, yesCount: yes, noCount: no },
    });

    this.logger.log(`Campaign Finished. YES: ${yes}, NO: ${no}`);

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
