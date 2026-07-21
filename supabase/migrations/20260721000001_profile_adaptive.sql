-- V14 : champs profil pour la génération de programme adaptatif
-- training_time : moment de la séance (matin/soir) → influence le timing nutritionnel
-- session_duration : durée cible par séance en minutes

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS training_time TEXT CHECK (training_time IN ('morning', 'evening')) DEFAULT 'evening',
  ADD COLUMN IF NOT EXISTS session_duration INT CHECK (session_duration BETWEEN 15 AND 120) DEFAULT 55;
