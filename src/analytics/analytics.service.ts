import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import utc from 'dayjs/plugin/utc';

dayjs.extend(weekOfYear);
dayjs.extend(utc);

export interface OverviewResponse {
  totalCustomers: number;
  predictions: { yes: number; no: number };
  campaigns: number;
}

export interface TrendResponse {
  bucket: string;
  yes: number;
  no: number;
}

export interface ByJobResponse {
  job: string;
  yes: number;
  no: number;
}

export type GroupByType = 'day' | 'week' | 'month';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getOverview(): Promise<OverviewResponse> {
    const [totalCustomers, predictions, campaigns] = await Promise.all([
      this.prisma.customer.count(),
      this.prisma.prediction.groupBy({
        by: ['predictedClass'],
        _count: { id: true },
      }),
      this.prisma.campaign.count(),
    ]);

    const predictionCounts = predictions.reduce(
      (acc, curr) => {
        if (curr.predictedClass.toLowerCase() === 'yes') {
          acc.yes = curr._count.id;
        } else if (curr.predictedClass.toLowerCase() === 'no') {
          acc.no = curr._count.id;
        }
        return acc;
      },
      { yes: 0, no: 0 },
    );

    return {
      totalCustomers,
      predictions: predictionCounts,
      campaigns,
    };
  }

  async getTrend(groupBy: GroupByType = 'month'): Promise<TrendResponse[]> {
    const predictions = await this.prisma.prediction.findMany({
      select: {
        predictedClass: true,
        timestamp: true,
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    if (predictions.length === 0) {
      return [];
    }

    const grouped = predictions.reduce(
      (acc, prediction) => {
        const bucket = this.formatBucket(prediction.timestamp, groupBy);

        if (!acc[bucket]) {
          acc[bucket] = { yes: 0, no: 0 };
        }

        if (prediction.predictedClass.toLowerCase() === 'yes') {
          acc[bucket].yes++;
        } else if (prediction.predictedClass.toLowerCase() === 'no') {
          acc[bucket].no++;
        }

        return acc;
      },
      {} as Record<string, { yes: number; no: number }>,
    );

    return Object.entries(grouped)
      .map(([bucket, counts]) => ({
        bucket,
        yes: counts.yes,
        no: counts.no,
      }))
      .sort((a, b) => a.bucket.localeCompare(b.bucket));
  }

  async getByJob(): Promise<ByJobResponse[]> {
    const predictions = await this.prisma.prediction.findMany({
      select: {
        predictedClass: true,
        customer: {
          select: {
            job: true,
          },
        },
      },
    });

    if (predictions.length === 0) {
      return [];
    }

    const grouped = predictions.reduce(
      (acc, prediction) => {
        const job = prediction.customer.job;

        if (!acc[job]) {
          acc[job] = { yes: 0, no: 0 };
        }

        if (prediction.predictedClass.toLowerCase() === 'yes') {
          acc[job].yes++;
        } else if (prediction.predictedClass.toLowerCase() === 'no') {
          acc[job].no++;
        }

        return acc;
      },
      {} as Record<string, { yes: number; no: number }>,
    );

    return Object.entries(grouped).map(([job, counts]) => ({
      job,
      yes: counts.yes,
      no: counts.no,
    }));
  }

  private formatBucket(timestamp: Date, groupBy: GroupByType): string {
    const date = dayjs(timestamp);

    switch (groupBy) {
      case 'day':
        return date.format('YYYY-MM-DD');
      case 'week':
        return `${date.year()}-W${date.week().toString().padStart(2, '0')}`;
      case 'month':
        return date.format('YYYY-MM');
      default:
        return date.format('YYYY-MM');
    }
  }
}
