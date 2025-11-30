import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import axios from 'axios';
import {
  MlHealthResponse,
  MlPredictionPayload,
  MlPredictionResponse,
} from './dto/ml-interface.dto';

@Injectable()
export class MlService {
  private readonly logger = new Logger(MlService.name);
  private base = process.env.ML_BASE_URL;

  async health(): Promise<Partial<MlHealthResponse>> {
    try {
      const { data } = await axios.get<MlHealthResponse>(
        `${this.base}/api/health`,
      );
      return data;
    } catch (error) {
      this.logger.error('ML Service Health Check Failed', error.message);
      return { success: false, status_code: 503 };
    }
  }

  async predict(input: MlPredictionPayload): Promise<MlPredictionResponse> {
    console.log(input);
    try {
      const { data } = await axios.post<MlPredictionResponse>(
        `${this.base}/api/predict`,
        input,
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );

      return data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        this.logger.error(
          'ML Validation Error:',
          JSON.stringify(error.response.data, null, 2),
        );
        throw new InternalServerErrorException(
          `ML Engine Validation Error: ${JSON.stringify(error.response.data.cause?.message || 'Check logs')}`,
        );
      }

      this.logger.error('Prediction Request Failed', error.message);
      throw new InternalServerErrorException(
        'Failed to get prediction from ML Engine',
      );
    }
  }
}
