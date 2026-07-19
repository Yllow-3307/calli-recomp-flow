-- V5 : configuration de la synchro Notion par utilisateur (retrouvée sur tous
-- ses appareils : bases liées, correspondances de colonnes, style de titre).
alter table public.profiles add column if not exists notion_config jsonb not null default '{}'::jsonb;
