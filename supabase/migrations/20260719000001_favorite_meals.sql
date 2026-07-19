-- Migration V4 : repas favoris (repas enregistrés réutilisables en 1 tap)
-- favorite_meals : tableau JSON [{ id, name, kcal, protein, carbs, fat }]

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS favorite_meals JSONB NOT NULL DEFAULT '[]'::jsonb;
