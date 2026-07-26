-- TABOOST Contract Review Dashboard
-- Run this entire file in the Supabase SQL Editor
-- Project: wuvbpwoilbkzdfntnahq

-- ─────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
-- TALENT
-- ─────────────────────────────────────────────
create table if not exists talent (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  manager_id uuid,           -- references auth.users(id) — populated after auth setup
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- SOURCE DOCUMENTS (SOP + precedents)
-- ─────────────────────────────────────────────
create table if not exists source_documents (
  id uuid primary key default uuid_generate_v4(),
  type text not null check (type in ('SOP', 'Precedent')),
  label text not null,
  clause_type text,          -- for precedents: e.g. "Usage Rights", "Exclusivity"
  storage_path text not null, -- Supabase Storage path
  openai_file_id text,       -- file ID in OpenAI vector store
  version text not null default 'v1.0',
  is_active boolean not null default true,
  approved_at timestamptz,
  approved_by uuid,
  deactivated_at timestamptz,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- REVIEWS
-- ─────────────────────────────────────────────
create table if not exists reviews (
  id uuid primary key default uuid_generate_v4(),
  talent_id uuid references talent(id) on delete set null,
  manager_id uuid,           -- references auth.users(id)
  brand text not null,
  contract_storage_path text not null,
  contract_filename text not null,
  deal_terms jsonb not null default '{}',
  overall_summary text,
  creator_risk_note text,
  status text not null default 'Draft Intake' check (status in (
    'Draft Intake',
    'Review Running',
    'Review Ready',
    'Manager Reviewing',
    'Redlines Approved',
    'DOCX Generated',
    'Sent to Brand',
    'Brand Response Received',
    'Finalized'
  )),
  openai_thread_id text,
  openai_assistant_id text,
  sop_version text,
  precedent_version text,
  model_used text,
  docx_storage_path text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- REDLINES
-- ─────────────────────────────────────────────
create table if not exists redlines (
  id uuid primary key default uuid_generate_v4(),
  review_id uuid not null references reviews(id) on delete cascade,
  redline_id text not null,          -- AI-assigned e.g. "RL-001"
  section_number text,
  section_title text,
  priority text not null check (priority in ('Must-Have', 'Nice-to-Have')),
  issue_summary text not null,
  business_risk text,
  original_language text,
  proposed_language text,
  redline_action text not null check (redline_action in ('Add', 'Delete', 'Replace', 'Modify')),
  fallback_position text,
  sop_basis text,
  manager_selected boolean not null default false,
  manager_edited_language text,      -- null = use proposed_language
  manager_note text,
  revision_history jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- AUDIT LOG
-- ─────────────────────────────────────────────
create table if not exists audit_log (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid,
  action text not null,              -- e.g. "review.created", "docx.downloaded", "redline.approved"
  resource_type text not null,       -- "review", "redline", "source_document", "docx"
  resource_id uuid,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- UPDATED_AT TRIGGER
-- ─────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger talent_updated_at before update on talent
  for each row execute function update_updated_at();

create trigger reviews_updated_at before update on reviews
  for each row execute function update_updated_at();

create trigger redlines_updated_at before update on redlines
  for each row execute function update_updated_at();

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
alter table talent enable row level security;
alter table reviews enable row level security;
alter table redlines enable row level security;
alter table source_documents enable row level security;
alter table audit_log enable row level security;

-- Authenticated users can read all (managers see all talent/reviews for now)
-- Tighten per-manager scoping in Phase 2 when roles are formalized
create policy "authenticated_read_talent" on talent for select to authenticated using (true);
create policy "authenticated_write_talent" on talent for all to authenticated using (true);

create policy "authenticated_read_reviews" on reviews for select to authenticated using (true);
create policy "authenticated_write_reviews" on reviews for all to authenticated using (true);

create policy "authenticated_read_redlines" on redlines for select to authenticated using (true);
create policy "authenticated_write_redlines" on redlines for all to authenticated using (true);

create policy "authenticated_read_sources" on source_documents for select to authenticated using (true);
create policy "authenticated_write_sources" on source_documents for all to authenticated using (true);

create policy "authenticated_read_audit" on audit_log for select to authenticated using (true);
create policy "authenticated_write_audit" on audit_log for insert to authenticated with check (true);

-- ─────────────────────────────────────────────
-- STORAGE BUCKETS
-- (Run separately if these error — Supabase may need bucket creation via dashboard)
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('contracts', 'contracts', false, 52428800, array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('generated-docs', 'generated-docs', false, 52428800, array['application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('source-documents', 'source-documents', false, 52428800, array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do nothing;

-- Storage RLS
create policy "auth_upload_contracts" on storage.objects for insert to authenticated with check (bucket_id = 'contracts');
create policy "auth_read_contracts" on storage.objects for select to authenticated using (bucket_id = 'contracts');
create policy "auth_upload_generated" on storage.objects for insert to authenticated with check (bucket_id = 'generated-docs');
create policy "auth_read_generated" on storage.objects for select to authenticated using (bucket_id = 'generated-docs');
create policy "auth_manage_sources" on storage.objects for all to authenticated using (bucket_id = 'source-documents');
