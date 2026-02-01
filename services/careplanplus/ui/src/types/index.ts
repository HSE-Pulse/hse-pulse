export interface HealthResponse {
  status: string
  model_loaded: boolean
  database_connected: boolean
  demo_mode: boolean
  timestamp: string
}

export interface DataStats {
  patients: number
  admissions: number
  diagnoses: number
  procedures: number
  nies_records: number
  icd_diagnosis_codes: number
  icd_procedure_codes: number
}

export interface Patient {
  _id: string
  subject_id: number
  gender: string
  anchor_age: number
  anchor_year: number
  anchor_year_group: string
}

export interface Admission {
  _id: string
  subject_id: number
  hadm_id: number
  admittime: string
  dischtime: string
  admission_type: string
  admission_location: string
  insurance: string
  language: string
  marital_status: string
  race: string
  edregtime: string | null
  edouttime: string | null
  hospital_expire_flag: number
  discharge_location: string | null
  deathtime: string | null
}

export interface DiagnosisIcd {
  _id: string
  subject_id: number
  hadm_id: number
  seq_num: number
  icd_code: number | string
  icd_version: number
}

export interface ProcedureIcd {
  _id: string
  subject_id: number
  hadm_id: number
  seq_num: number
  chartdate: string | null
  icd_code: number | string
  icd_version: number
}

export interface IcdCode {
  _id: string
  icd_code: number | string
  icd_version: number
  long_title: string
}

export interface NiesRecord {
  _id: string
  agegroup: number
  Gender: number
  sex: number
  disability: number
  ethnicgrp: number
  HealthRegion: number
  Source_of_Admission_Category: number
  insure: number
  medcard: number
  HospSize: number
  HospModel: number
  admtype: number
  admcode: number
  xadmtype: number
  AdmTypeBinary: number
  ScoreOVERALL: number
  satisfaction_score: number
  condition_label: string
  icd10_from: string
  icd10_to: string
  icd9_from: number
  icd9_to: number
}

export interface NiesSummaryCategory {
  condition_label: string
  count: number
  avg_satisfaction: number
  min_satisfaction: number
  max_satisfaction: number
  icd10_from: string
  icd10_to: string
}

export interface NiesSummary {
  categories: NiesSummaryCategory[]
  total_records: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
  pages: number
}

export interface PatientDetail extends Patient {
  admissions: Admission[]
  diagnoses: DiagnosisIcd[]
  procedures: ProcedureIcd[]
}

export interface Diagnosis {
  icd_code: string
  seq_num: number
  long_title?: string
}

export interface RecommendationRequest {
  diagnoses: Diagnosis[]
  procedure_history?: string[]
  patient_age?: number
  patient_gender?: string
  top_k: number
}

export interface RecommendedProcedure {
  procedure_code: string
  procedure_description: string | null
  confidence: number
  rank: number
}

export interface PathwayStep {
  step_number: number
  procedure_code: string
  procedure_description: string | null
  confidence: number
}

export interface RecommendationResponse {
  recommendations: RecommendedProcedure[]
  full_pathway: PathwayStep[] | null
  model_version: string
  inference_time_ms: number
}

export interface ServiceConfig {
  model_path: string
  tokenizer: string
  top_k: number
  confidence_threshold: number
  max_length: number
  enable_pathway: boolean
}

export interface SampleCase {
  name: string
  diagnoses: Diagnosis[]
}
