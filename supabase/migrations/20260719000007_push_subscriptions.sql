-- V11.0 : table des abonnements push notifications
create table if not exists push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  endpoint text not null,
  keys jsonb not null,
  created_at timestamptz default now()
);
alter table push_subscriptions enable row level security;
drop policy if exists "users own push subs" on push_subscriptions;
create policy "users own push subs" on push_subscriptions
  for all using (auth.uid() = user_id);
