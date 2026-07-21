-- V15 : assouplit la contrainte days_per_week de {5,6} à [3,6].
-- L'onboarding + les Paramètres permettent désormais 3 à 6 jours d'entraînement,
-- et days_perWeek reflète désormais le nombre réel de trainingDays (pas 5/6 figés).
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_days_per_week_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_days_per_week_check CHECK (days_per_week BETWEEN 3 AND 6);
