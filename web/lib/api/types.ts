export type AuditStatus = "pending" | "resolved" | "reopened";

export type BatchStatus = "pending" | "exported" | "cleaned";

export type OMRResult = {
  filename: string;
  data: Record<string, string>;
  processed_image: string;
  processed_image_url?: string | null;
  warnings: string[];
};

export type AuditResponseModel = {
  question: string;
  read_value: string | null;
  corrected_value: string | null;
};

export type AuditListItem = {
  id: number;
  file_id: string;
  template: string;
  batch_id: string;
  issues: string[];
  status: AuditStatus;
  image_url?: string | null;
  marked_image_url?: string | null;
  created_at: string;
};

export type AuditDetail = {
  id: number;
  file_id: string;
  template: string;
  batch_id: string;
  issues: string[];
  status: AuditStatus;
  notes?: string | null;
  raw_answers: Record<string, string>;
  image_url?: string | null;
  marked_image_url?: string | null;
  created_at: string;
  updated_at: string;
  responses: AuditResponseModel[];
};

export type AuditListResponse = {
  items: AuditListItem[];
  total: number;
  pending: number;
  resolved: number;
  reopened: number;
  page: number;
  page_size: number;
  total_pages: number;
};

export type AuditSummary = {
  batch_id: string;
  total: number;
  pending: number;
  resolved: number;
  status: BatchStatus;
  items: AuditListItem[];
};

export type ProcessResponse = {
  status: string;
  results: OMRResult[];
  summary: {
    total: number;
    processed: number;
    errors: number;
    batch_id: string;
  };
  errors?: string[] | null;
  audit?: AuditSummary | null;
};

export type AuditDecisionRequest = {
  answers: Record<string, string>;
  notes?: string;
};

export type ExportMetadata = {
  batch_id: string;
  status: BatchStatus;
  exported_at: string;
  exported_by?: string | null;
  corrected_results_path: string;
  manifest_path: string;
};
