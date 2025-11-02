import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class MlService {
  private base = process.env.ML_BASE_URL!;

  async health() {
    const { data } = await axios.get(`${this.base}/api/health`);
    return data;
  }

  async predict(input: any) {
    const { data } = await axios.post(`${this.base}/api/predict`, input, {
      headers: { 'Content-Type': 'application/json' },
    });
    return data;
  }
}
