import { request } from '@/utils/request';
import type {
  AssessmentRecord,
  DiabetesAssessmentRequest,
  StrokeAssessmentRequest,
  VascularAgeRequest,
  AssessmentResponse,
} from '@/types/assessment';

export const assessmentApi = {
  // 获取评估历史
  getHistory: (params?: { type?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<{ data: AssessmentRecord[]; total: number }>(`/assessments?${query}`, {
      method: 'GET',
    });
  },

  // 糖尿病风险评估
  assessDiabetes: (data: DiabetesAssessmentRequest) => {
    return request<AssessmentResponse>('/assessments/diabetes', {
      method: 'POST',
      data,
    });
  },

  // 卒中风险评估
  assessStroke: (data: StrokeAssessmentRequest) => {
    return request<AssessmentResponse>('/assessments/stroke', {
      method: 'POST',
      data,
    });
  },

  // 血管年龄评估
  assessVascularAge: (data: VascularAgeRequest) => {
    return request<AssessmentResponse>('/assessments/vascular-age', {
      method: 'POST',
      data,
    });
  },

  // 获取评估详情
  getDetail: (id: string) => {
    return request<AssessmentRecord>(`/assessments/${id}`, {
      method: 'GET',
    });
  },
};
