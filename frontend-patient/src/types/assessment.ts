export interface AssessmentRecord {
  id: string;
  type: 'diabetes' | 'stroke' | 'vascular_age' | 'stroke_recognition';
  score: number;
  riskLevel: 'low' | 'medium' | 'high';
  result: string;
  suggestions: string[];
  createdAt: string;
}

export interface DiabetesAssessmentRequest {
  age: number;
  weight: number;
  height: number;
  waistCircumference?: number;
  exerciseFrequency: 'never' | 'occasionally' | 'regularly';
  familyHistory: boolean;
  hypertension: boolean;
}

export interface StrokeAssessmentRequest {
  age: number;
  gender: 'male' | 'female';
  hypertension: boolean;
  diabetes: boolean;
  smoking: boolean;
  heartDisease: boolean;
  familyHistory: boolean;
}

export interface VascularAgeRequest {
  age: number;
  gender: 'male' | 'female';
  systolicBP: number;
  diastolicBP: number;
  cholesterol: number;
  smoking: boolean;
  diabetes: boolean;
}

export interface AssessmentResponse {
  id: string;
  type: string;
  score: number;
  riskLevel: 'low' | 'medium' | 'high';
  result: string;
  suggestions: string[];
  vascularAge?: number;
}
