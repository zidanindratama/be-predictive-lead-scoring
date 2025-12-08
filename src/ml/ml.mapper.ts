import { Customer } from '@prisma/client';
import { MlPredictionPayload } from './dto/ml-interface.dto';
export class MlMapper {
  static toPredictionPayload(customer: Customer): MlPredictionPayload {
    return {
      personal_info: {
        age: customer.age,
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
      },
      macro_info: {
        employment_variation_rate: customer.emp_var_rate,
        euribor_3m_rate: customer.euribor3m,
        number_employed: customer.nr_employed,
        consumer_price_index: customer.cons_price_idx,
        consumer_confidence_index: customer.cons_conf_idx,
      },
    };
  }

  private static sanitizeJob(job: string): string {
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

    if (validJobs.includes(job)) {
      return job;
    }

    if (job === 'retired') {
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
        return { type: 'course' };
      case 'university.degree':
        return { type: 'university' };

      case 'illiterate':
        return { type: 'illiterate' };

      default:
        return { type: 'university' };
    }
  }
}
