-- V10 : playlists musique par type de séance (liens Spotify/Deezer/Apple Music)
alter table public.profiles add column if not exists music_playlists jsonb not null default '{}'::jsonb;
