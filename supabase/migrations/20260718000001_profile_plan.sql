-- Migration : profil enrichi pour la génération de plan personnalisé
-- (objectif, morphologie complète, capacités déclarées, plan généré mis en cache)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS age INT CHECK (age BETWEEN 10 AND 100),
  ADD COLUMN IF NOT EXISTS sex TEXT CHECK (sex IN ('homme', 'femme')),
  ADD COLUMN IF NOT EXISTS capacities JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS plan JSONB;
