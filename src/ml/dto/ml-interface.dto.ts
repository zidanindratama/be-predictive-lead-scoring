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
    // age_category: string;
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
    cons_conf_idx: number;
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
  };
  meta: any;
}
