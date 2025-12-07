import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import {
  MlHealthResponse,
  MlModelInfoResponse,
  MlPredictionPayload,
  MlPredictionResponse,
} from './dto/ml-interface.dto';

@Injectable()
export class MlService {
  private readonly logger = new Logger(MlService.name);
  private modelUrl = process.env.ML_BASE_URL;
  private get axiosInstance(): AxiosInstance {
    return axios.create({
      baseURL: this.modelUrl,
      headers: {
        Authorization: `Bearer ${process.env.ML_API_KEY}`,
      },
    });
  }
  async health(): Promise<Partial<MlHealthResponse>> {
    try {
      const { data } =
        await this.axiosInstance.get<MlHealthResponse>(`/api/health`);
      return data;
    } catch (error) {
      this.logger.error('ML Service Health Check Failed', error.message);
      return { success: false, status_code: 503 };
    }
  }

  async predict(input: MlPredictionPayload): Promise<MlPredictionResponse> {
    console.log(input);
    try {
      const { data } = await this.axiosInstance.post<MlPredictionResponse>(
        `/api/predict`,
        input,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.ML_API_KEY}`,
          },
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

  async getModelInfo(): Promise<MlModelInfoResponse> {
    try {
      const { data } = await this.axiosInstance.get<MlModelInfoResponse>(
        `/api/model-info`,
      );
      return data;
    } catch (error) {
      this.logger.error('Failed to fetch Model Info', error.message);
      throw new InternalServerErrorException(
        'Failed to fetch Model Information from ML Service',
      );
    }
  }
}
