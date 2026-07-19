-- V7 : nom d'utilisateur affichable (section Compte des paramètres).
alter table public.profiles add column if not exists username text;
