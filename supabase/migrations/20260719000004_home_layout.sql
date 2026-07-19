-- V8 : disposition personnalisée de la page Accueil (blocs, sous-sections, tailles).
alter table public.profiles add column if not exists home_layout jsonb not null default '[]'::jsonb;
