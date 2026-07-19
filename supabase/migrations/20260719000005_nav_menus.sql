-- V9 : barre de menu mobile personnalisable (3 entrées choisies, Accueil & Plus fixes)
alter table public.profiles add column if not exists nav_menus jsonb not null default '[]'::jsonb;
