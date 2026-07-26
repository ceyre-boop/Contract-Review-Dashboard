export type ReviewStatus =
  | 'Draft Intake'
  | 'Review Running'
  | 'Review Ready'
  | 'Manager Reviewing'
  | 'Redlines Approved'
  | 'DOCX Generated'
  | 'Sent to Brand'
  | 'Brand Response Received'
  | 'Finalized'

export type RedlinePriority = 'Must-Have' | 'Nice-to-Have'
export type RedlineAction = 'Add' | 'Delete' | 'Replace' | 'Modify'
export type SourceType = 'SOP' | 'Precedent'

export interface DealTerms {
  rate?: string
  total_compensation?: string
  deliverables?: string
  agreed_usage?: string
  timeline?: string
  due_dates?: string
  commission?: string
  exclusivity?: string
  spark_ads?: string
  live_period?: string
  special_terms?: string
  brand_deadline?: string
  manager_notes?: string
}

export interface Talent {
  id: string
  name: string
  manager_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Review {
  id: string
  talent_id: string | null
  manager_id: string | null
  brand: string
  contract_storage_path: string
  contract_filename: string
  deal_terms: DealTerms
  overall_summary: string | null
  creator_risk_note: string | null
  status: ReviewStatus
  openai_thread_id: string | null
  openai_assistant_id: string | null
  sop_version: string | null
  precedent_version: string | null
  model_used: string | null
  docx_storage_path: string | null
  error_message: string | null
  created_at: string
  updated_at: string
  // joined
  talent?: Talent
  redlines?: Redline[]
}

export interface RevisionEntry {
  proposed_language: string
  instructions: string
  revised_at: string
}

export interface Redline {
  id: string
  review_id: string
  redline_id: string
  section_number: string | null
  section_title: string | null
  priority: RedlinePriority
  issue_summary: string
  business_risk: string | null
  original_language: string | null
  proposed_language: string | null
  redline_action: RedlineAction
  fallback_position: string | null
  sop_basis: string | null
  manager_selected: boolean
  manager_edited_language: string | null
  manager_note: string | null
  revision_history: RevisionEntry[]
  created_at: string
  updated_at: string
}

export interface SourceDocument {
  id: string
  type: SourceType
  label: string
  clause_type: string | null
  storage_path: string
  openai_file_id: string | null
  version: string
  is_active: boolean
  approved_at: string | null
  approved_by: string | null
  deactivated_at: string | null
  created_at: string
}

// AI review response structure
export interface AIReviewResponse {
  overall_summary: string
  creator_risk_note: string
  redlines: AIRedline[]
  flags: string[]  // any conflict/error flags
}

export interface AIRedline {
  redline_id: string
  section_number: string
  section_title: string
  priority: RedlinePriority
  issue_summary: string
  business_risk: string
  original_language: string
  proposed_language: string
  redline_action: RedlineAction
  fallback_position: string
  sop_basis: string
  manager_selected: false
}
