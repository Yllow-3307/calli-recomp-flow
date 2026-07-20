-- V13 : rendre endpoint unique pour éviter l'erreur onConflict
alter table public.push_subscriptions add constraint if not exists push_subscriptions_endpoint_key unique (endpoint);
