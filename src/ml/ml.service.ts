import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class MlService {
  private readonly logger = new Logger(MlService.name);
  private base = process.env.ML_BASE_URL; // Pastikan di .env ada: http://localhost:5000 atau URL production

  async health() {
    try {
      const { data } = await axios.get(`${this.base}/api/health`);
      return data;
    } catch (error) {
      this.logger.error('ML Service Health Check Failed', error);
      return { status: 'down' };
    }
  }

  async predict(input: any) {
    try {
      const { data } = await axios.post(`${this.base}/api/predict`, input, {
        headers: { 'Content-Type': 'application/json' },
      });

      return data;
    } catch (error) {
      console.log('error', error.response?.data || error.message);
      this.logger.error(
        'Prediction Request Failed',
        error.response?.data || error.message,
      );
      throw new InternalServerErrorException(
        'Failed to get prediction from ML Engine',
      );
    }
  }
}
