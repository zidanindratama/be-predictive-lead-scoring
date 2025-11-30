import { Customer } from '@prisma/client';
import { MlPredictionPayload } from './dto/ml-interface.dto';

export class MlMapper {
  static toPredictionPayload(customer: Customer): MlPredictionPayload {
    return {
      personal_info: {
        age: customer.age,
        age_category: this.getAgeCategory(customer.age),
        job: this.sanitizeJob(customer.job),
        marital: this.sanitizeMarital(customer.marital),
        education: this.mapEducation(customer.education),
      },
      financial_info: {
        default: this.toBoolean(customer.creditDefault),
        housing: this.toBoolean(customer.housing),
        loan: this.toBoolean(customer.loan),
      },
      contact_info: {
        contact: customer.contact,
        day_of_week: customer.day_of_week,
        month: customer.month,
      },
      campaign_info: {
        campaign: customer.campaign,
        previous: customer.previous,
        poutcome: customer.poutcome,
        cons_conf_idx: customer.cons_conf_idx,
      },
    };
  }

  private static getAgeCategory(age: number): string {
    if (age < 30) return 'struggling';
    if (age <= 50) return 'stable';
    if (age <= 65) return 'about to retire';

    return 'old age';
  }

  private static sanitizeJob(job: string): string {
    let cleanJob = job.replace('.', '').toLowerCase();
    cleanJob = cleanJob.replace('-', '_');

    const validJobs = [
      'blue_collar',
      'housemaid',
      'services',
      'admin',
      'technician',
      'management',
      'self_employed',
      'entrepreneur',
      'unemployed',
      'student',
    ];

    if (validJobs.includes(cleanJob)) {
      return cleanJob;
    }

    if (cleanJob === 'retired') {
      return 'unemployed';
    }

    return 'unemployed';
  }

  private static sanitizeMarital(marital: string): string {
    if (marital === 'married') return 'married';
    return 'single';
  }

  private static toBoolean(val: string): boolean {
    return val?.toLowerCase() === 'yes';
  }

  private static mapEducation(edu: string): {
    type: 'school' | 'university' | 'course' | 'illiterate';
    level?: 'primary' | 'middle' | 'high';
    grade?: number;
  } {
    switch (edu) {
      case 'basic.4y':
        return { type: 'school', level: 'primary', grade: 4 };
      case 'basic.6y':
        return { type: 'school', level: 'primary', grade: 6 };
      case 'basic.9y':
        return { type: 'school', level: 'middle', grade: 9 };
      case 'high.school':
        return { type: 'school', level: 'high', grade: 12 };

      case 'professional.course':
        return { type: 'university' };
      case 'university.degree':
        return { type: 'university' };

      case 'illiterate':
        return { type: 'illiterate' };

      default:
        return { type: 'university' };
    }
  }
}
