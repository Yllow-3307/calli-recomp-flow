-- Migration V2 : jours d'entraînement personnalisables + remplacements d'exercices
-- training_days : tableau d'indices JSON (0 = Lundi … 6 = Dimanche)
-- exercise_swaps : dictionnaire JSON "dayKey::exId" → nom de remplacement

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS training_days JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS exercise_swaps JSONB NOT NULL DEFAULT '{}'::jsonb;
