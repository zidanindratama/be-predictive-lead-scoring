export interface MlHealthResponse {
  status_code: number;
  success: boolean;
  timestamp: string;
  meta: {
    model_loaded: boolean;
    app_info: { version: string };
    model_info: any;
    system_info: any;
  };
}

export interface MlPredictionPayload {
  personal_info: {
    age: number;
    job: string;
    marital: string;
    education: {
      type: 'school' | 'university' | 'course' | 'illiterate';
      level?: 'primary' | 'middle' | 'high';
      grade?: number;
    };
  };
  financial_info: {
    default: boolean;
    housing: boolean;
    loan: boolean;
  };
  contact_info: {
    contact: string;
    day_of_week: string;
    month: string;
  };
  campaign_info: {
    campaign: number;
    previous: number;
    poutcome: string;
  };
  macro_info: {
    employment_variation_rate: number;
    euribor_3m_rate: number;
    number_employed: number;
    consumer_price_index: number;
    consumer_confidence_index: number;
  };
}

export interface MlPredictionResponse {
  status_code: number;
  success: boolean;
  timestamp: string;
  data: {
    predicted_class: 'YES' | 'NO';
    probability_yes: number;
    probability_no: number;
    probability_yes_percentage: string;
    probability_no_percentage: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY LOW';
  };
  meta: any;
}

export interface MlModelInfoResponse {
  generated_at: string;
  model_name: string;
  performance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    auc: number;
  };
  performance_percentage: {
    accuracy: string;
    precision: string;
    recall: string;
    f1_score: string;
    auc: string;
  };
  business_impact: {
    model_auc_score: string | number;
    predicted_positive_rate: string | number;
    actual_positive_rate: string | number;
  };
}
