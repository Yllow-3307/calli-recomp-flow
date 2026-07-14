-- Supabase Schema Migration for Calli Recomp Tracker

-- 1. Create Tables
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  weight NUMERIC NOT NULL DEFAULT 75.0,
  height NUMERIC NOT NULL DEFAULT 178.0,
  goal TEXT DEFAULT 'Recomposition corporelle',
  days_per_week INT NOT NULL DEFAULT 6 CHECK (days_per_week IN (5, 6)),
  level TEXT NOT NULL DEFAULT 'intermédiaire' CHECK (level IN ('débutant', 'intermédiaire', 'avancé')),
  equipment TEXT[] DEFAULT ARRAY['Barre traction', 'Anneaux', 'Haltères']::TEXT[],
  onboarded BOOLEAN DEFAULT FALSE,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.workout_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  duration_min INT NOT NULL,
  description TEXT,
  warmup JSONB NOT NULL DEFAULT '[]'::jsonb,
  optional_cardio JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.exercise_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_template_id UUID REFERENCES public.workout_templates ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  muscle_group TEXT DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('reps', 'time', 'distance')),
  sets INT NOT NULL DEFAULT 3,
  reps_min INT,
  reps_max INT,
  rest_seconds INT NOT NULL DEFAULT 60,
  instructions TEXT DEFAULT '',
  alternatives JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.workout_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  day_key TEXT NOT NULL,
  day_title TEXT NOT NULL,
  duration INT NOT NULL, -- in minutes
  rpe INT CHECK (rpe BETWEEN 1 AND 10),
  filmed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  total_volume NUMERIC,
  success_count INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.exercise_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.workout_sessions ON DELETE CASCADE NOT NULL,
  ex_id TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('reps', 'time', 'distance')),
  target_min INT,
  target_max INT,
  sets JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of object logs: [{reps, time, weight, rpe, done}]
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cardio_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type TEXT NOT NULL CHECK (type IN ('course', 'rameur', 'natation', 'vélo')),
  distance NUMERIC,
  duration INT NOT NULL, -- in minutes
  pace TEXT,
  zone TEXT CHECK (zone IN ('zone2', 'intervalles', 'autre')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.body_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  weight NUMERIC,
  waist NUMERIC,
  sleep NUMERIC,
  energy INT CHECK (energy BETWEEN 1 AND 5),
  fatigue INT CHECK (fatigue BETWEEN 1 AND 5),
  photo_note TEXT,
  photo_face_path TEXT,
  photo_profile_path TEXT,
  photo_back_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.meal_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name TEXT NOT NULL,
  kcal INT NOT NULL,
  protein NUMERIC NOT NULL,
  carbs NUMERIC NOT NULL,
  fat NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hydration_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  liters NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

CREATE TABLE IF NOT EXISTS public.progress_tests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  test_id TEXT NOT NULL,
  value NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 2. Setup Row-Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cardio_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hydration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_tests ENABLE ROW LEVEL SECURITY;


-- 3. RLS Security Policies

-- profiles
CREATE POLICY "Users can manage their own profile"
  ON public.profiles FOR ALL TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- workout_templates (Publicly readable, writeable only by system/admins)
CREATE POLICY "Allow select on workout templates for authenticated users"
  ON public.workout_templates FOR SELECT TO authenticated USING (true);

-- exercise_templates (Publicly readable, writeable only by system/admins)
CREATE POLICY "Allow select on exercise templates for authenticated users"
  ON public.exercise_templates FOR SELECT TO authenticated USING (true);

-- workout_sessions
CREATE POLICY "Users can manage their own workout sessions"
  ON public.workout_sessions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- exercise_logs (tied to session_id, but check through parent table workout_sessions)
CREATE POLICY "Users can manage their own exercise logs"
  ON public.exercise_logs FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workout_sessions
    WHERE public.workout_sessions.id = public.exercise_logs.session_id
    AND public.workout_sessions.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workout_sessions
    WHERE public.workout_sessions.id = public.exercise_logs.session_id
    AND public.workout_sessions.user_id = auth.uid()
  ));

-- cardio_logs
CREATE POLICY "Users can manage their own cardio logs"
  ON public.cardio_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- body_metrics
CREATE POLICY "Users can manage their own body metrics"
  ON public.body_metrics FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- meal_logs
CREATE POLICY "Users can manage their own meal logs"
  ON public.meal_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- hydration_logs
CREATE POLICY "Users can manage their own hydration logs"
  ON public.hydration_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- progress_tests
CREATE POLICY "Users can manage their own progress tests"
  ON public.progress_tests FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- 4. Auth Trigger for Profile Initialization
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, weight, height, goal, days_per_week, level, equipment, onboarded)
  VALUES (
    NEW.id,
    75.0,
    178.0,
    'Recomposition corporelle',
    6,
    'intermédiaire',
    ARRAY['Barre traction', 'Anneaux', 'Haltères']::TEXT[],
    FALSE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 5. Insert Seed templates for workout templates and exercises
TRUNCATE public.exercise_templates CASCADE;
TRUNCATE public.workout_templates CASCADE;

INSERT INTO public.workout_templates (id, day_of_week, title, category, duration_min, description, warmup, optional_cardio) VALUES ('0fb1b462-d474-4a38-b1ec-e34c53b5ab90', 1, 'Running Zone 2 + Core léger', 'running_zone2', 55, 'Endurance + brûle graisse en Zone 2 conversationnelle', '["5 min marche/jog léger", "mobilisations hanches/mollets"]'::jsonb, '{"sport": "course", "distanceKm": [6, 7], "intensity": "Zone 2 conversationnelle"}'::jsonb);
  INSERT INTO public.exercise_templates (id, workout_template_id, name, muscle_group, type, sets, reps_min, reps_max, rest_seconds, instructions, alternatives, sort_order) VALUES   ('f7aed670-dbf8-4a59-9f89-fc45ade32f00', '0fb1b462-d474-4a38-b1ec-e34c53b5ab90', 'Hollow body hold', '', 'time', 3, 30, 45, 60, '', '[]'::jsonb, 0);
  INSERT INTO public.exercise_templates (id, workout_template_id, name, muscle_group, type, sets, reps_min, reps_max, rest_seconds, instructions, alternatives, sort_order) VALUES   ('fda8b269-91ba-442f-8a2d-f47594453349', '0fb1b462-d474-4a38-b1ec-e34c53b5ab90', 'Planche', '', 'time', 3, 45, 45, 60, '', '[]'::jsonb, 1);

INSERT INTO public.workout_templates (id, day_of_week, title, category, duration_min, description, warmup, optional_cardio) VALUES ('aceb378d-95be-4b71-ac65-537231aa3002', 2, 'PUSH avancé — HSPU prep + Push PPL', 'push', 47, 'épaules · poitrine · triceps', '["Jumping jacks ou high knees 30-60s", "cercles bras + rotations épaules", "10 squats légers", "10 pompes légères"]'::jsonb, '{}'::jsonb);
  INSERT INTO public.exercise_templates (id, workout_template_id, name, muscle_group, type, sets, reps_min, reps_max, rest_seconds, instructions, alternatives, sort_order) VALUES   ('4c229624-a7df-4246-a0d5-bbfef3794955', 'aceb378d-95be-4b71-ac65-537231aa3002', 'Pike push-up lesté', 'épaules', 'reps', 4, 8, 12, 90, 'Vers HSPU mur', '[]'::jsonb, 0);
  INSERT INTO public.exercise_templates (id, workout_template_id, name, muscle_group, type, sets, reps_min, reps_max, rest_seconds, instructions, alternatives, sort_order) VALUES   ('88f5eb8b-cc67-42bb-afcd-0fbfb48fbc18', 'aceb378d-95be-4b71-ac65-537231aa3002', 'HSPU négatif mur', 'épaules', 'reps', 4, 4, 7, 90, '', '[]'::jsonb, 1);
  INSERT INTO public.exercise_templates (id, workout_template_id, name, muscle_group, type, sets, reps_min, reps_max, rest_seconds, instructions, alternatives, sort_order) VALUES   ('f9ea7580-082c-436e-aff9-6963e5578325', 'aceb378d-95be-4b71-ac65-537231aa3002', 'Pompes archer', 'épaules', 'reps', 3, 6, 10, 90, '', '[]'::jsonb, 2);
  INSERT INTO public.exercise_templates (id, workout_template_id, name, muscle_group, type, sets, reps_min, reps_max, rest_seconds, instructions, alternatives, sort_order) VALUES   ('750491af-994f-4688-ad1a-c9476f611011', 'aceb378d-95be-4b71-ac65-537231aa3002', 'Dips', 'épaules', 'reps', 4, 8, 12, 90, 'Dips lestés ou profonds', '[]'::jsonb, 3);
  INSERT INTO public.exercise_templates (id, workout_template_id, name, muscle_group, type, sets, reps_min, reps_max, rest_seconds, instructions, alternatives, sort_order) VALUES   ('ef53f667-e565-4c32-b713-7b733c6a8e59', 'aceb378d-95be-4b71-ac65-537231aa3002', 'Pompes standard / déclinées / diamant', 'épaules', 'reps', 4, 10, 15, 90, '', '[]'::jsonb, 4);
  INSERT INTO public.exercise_templates (id, workout_template_id, name, muscle_group, type, sets, reps_min, reps_max, rest_seconds, instructions, alternatives, sort_order) VALUES   ('336c71e2-3754-4c60-8a7b-fb5a399b9a66', 'aceb378d-95be-4b71-ac65-537231aa3002', 'Handstand libre', 'épaules', 'time', 10, 5, 8, 60, '', '[]'::jsonb, 5);
  INSERT INTO public.exercise_templates (id, workout_template_id, name, muscle_group, type, sets, reps_min, reps_max, rest_seconds, instructions, alternatives, sort_order) VALUES   ('c5e9909c-52a3-4b4b-b12f-a3a5c0d07c00', 'aceb378d-95be-4b71-ac65-537231aa3002', 'Hollow body iso', 'épaules', 'time', 4, 35, 50, 60, '', '[]'::jsonb, 6);
  INSERT INTO public.exercise_templates (id, workout_template_id, name, muscle_group, type, sets, reps_min, reps_max, rest_seconds, instructions, alternatives, sort_order) VALUES   ('0c8f680a-9766-4322-941b-d7deb03b271c', 'aceb378d-95be-4b71-ac65-537231aa3002', 'Planche + planche latérale lestée', 'épaules', 'time', 3, 30, 55, 60, '', '[]'::jsonb, 7);

INSERT INTO public.workout_templates (id, day_of_week, title, category, duration_min, description, warmup, optional_cardio) VALUES ('8321ba24-329b-49b9-b885-c4e68505d94e', 3, 'Running Fractionné 6 km', 'running_intervals', 55, 'mollets · hanche · quadriceps', '["1 km échauffement"]'::jsonb, '{"sport": "course", "distanceKm": 6, "intervals": "5×2 min rapide / 90s récup"}'::jsonb);
  INSERT INTO public.exercise_templates (id, workout_template_id, name, muscle_group, type, sets, reps_min, reps_max, rest_seconds, instructions, alternatives, sort_order) VALUES   ('1c635f38-b881-4428-af1e-7137c4af71ef', '8321ba24-329b-49b9-b885-c4e68505d94e', 'Bulgarian split squats ou fentes', 'mollets', 'reps', 3, 10, 10, 90, '', '[]'::jsonb, 0);

INSERT INTO public.workout_templates (id, day_of_week, title, category, duration_min, description, warmup, optional_cardio) VALUES ('cc0c012e-df15-456b-904d-5d44ccdd163e', 4, 'PULL — Muscle-up prep + Pull PPL', 'pull', 47, 'dos · biceps · avant-bras · tirage', '["Jumping jacks ou high knees 30-60s", "cercles bras + rotations épaules", "10 squats légers", "10 pompes légères"]'::jsonb, '{}'::jsonb);
  INSERT INTO public.exercise_templates (id, workout_template_id, name, muscle_group, type, sets, reps_min, reps_max, rest_seconds, instructions, alternatives, sort_order) VALUES   ('ffc1d156-207f-4b02-a18b-ceb26dc402fc', 'cc0c012e-df15-456b-904d-5d44ccdd163e', 'Tractions strictes', 'dos', 'reps', 4, 8, 10, 90, '', '[]'::jsonb, 0);
  INSERT INTO public.exercise_templates (id, workout_template_id, name, muscle_group, type, sets, reps_min, reps_max, rest_seconds, instructions, alternatives, sort_order) VALUES   ('69b0bb59-f766-4017-9b1c-24058118f2a0', 'cc0c012e-df15-456b-904d-5d44ccdd163e', 'Chest-to-bar', 'dos', 'reps', 4, 4, 7, 90, '', '[]'::jsonb, 1);
  INSERT INTO public.exercise_templates (id, workout_template_id, name, muscle_group, type, sets, reps_min, reps_max, rest_seconds, instructions, alternatives, sort_order) VALUES   ('e5e5811b-f1ca-424b-bfef-bb3f87d5e8df', 'cc0c012e-df15-456b-904d-5d44ccdd163e', 'Tractions explosives', 'dos', 'reps', 4, 4, 6, 90, '', '[]'::jsonb, 2);
  INSERT INTO public.exercise_templates (id, workout_template_id, name, muscle_group, type, sets, reps_min, reps_max, rest_seconds, instructions, alternatives, sort_order) VALUES   ('1c45e43d-a2c5-4cc7-9589-f6a05159bbf3', 'cc0c012e-df15-456b-904d-5d44ccdd163e', 'Transition muscle-up bande', 'dos', 'reps', 3, 4, 6, 90, '', '["Australian rows si pas encore prêt"]'::jsonb, 3);
  INSERT INTO public.exercise_templates (id, workout_template_id, name, muscle_group, type, sets, reps_min, reps_max, rest_seconds, instructions, alternatives, sort_order) VALUES   ('3a783abd-850a-4d16-8962-df982f14553c', 'cc0c012e-df15-456b-904d-5d44ccdd163e', 'Rows inversés / Australian pull-ups', 'dos', 'reps', 4, 8, 15, 90, '', '[]'::jsonb, 4);
  INSERT INTO public.exercise_templates (id, workout_template_id, name, muscle_group, type, sets, reps_min, reps_max, rest_seconds, instructions, alternatives, sort_order) VALUES   ('a38fb98e-cb9f-4888-93c6-e4ad5b09dbeb', 'cc0c012e-df15-456b-904d-5d44ccdd163e', 'Chin-ups / tractions supinées', 'dos', 'reps', 3, 6, 10, 90, '', '[]'::jsonb, 5);
  INSERT INTO public.exercise_templates (id, workout_template_id, name, muscle_group, type, sets, reps_min, reps_max, rest_seconds, instructions, alternatives, sort_order) VALUES   ('8d1668d0-b40b-43fb-8f23-a47725c3af15', 'cc0c012e-df15-456b-904d-5d44ccdd163e', 'Relevés de jambes suspendus', 'dos', 'reps', 3, 10, 15, 60, '', '[]'::jsonb, 6);
  INSERT INTO public.exercise_templates (id, workout_template_id, name, muscle_group, type, sets, reps_min, reps_max, rest_seconds, instructions, alternatives, sort_order) VALUES   ('9d289cbf-60b7-481c-ad25-682a818d6c79', 'cc0c012e-df15-456b-904d-5d44ccdd163e', 'Dragon flag', 'dos', 'reps', 3, 5, 8, 90, '', '[]'::jsonb, 7);

INSERT INTO public.workout_templates (id, day_of_week, title, category, duration_min, description, warmup, optional_cardio) VALUES ('e4a67a42-3715-4298-b434-0358876d3978', 5, 'Running Zone 2 récup + jambes légères', 'running_recovery', 55, 'Running Zone 2 récup + jambes légères', '["5 min marche/jog léger", "mobilisations hanches/mollets"]'::jsonb, '{"sport": "course", "distanceKm": 6, "intensity": "récup active très conversationnelle"}'::jsonb);
  INSERT INTO public.exercise_templates (id, workout_template_id, name, muscle_group, type, sets, reps_min, reps_max, rest_seconds, instructions, alternatives, sort_order) VALUES   ('ffda4f18-f6cc-4c3b-9798-b3e33d427cab', 'e4a67a42-3715-4298-b434-0358876d3978', 'Pont fessier', '', 'reps', 3, 15, 25, 60, '', '[]'::jsonb, 0);
  INSERT INTO public.exercise_templates (id, workout_template_id, name, muscle_group, type, sets, reps_min, reps_max, rest_seconds, instructions, alternatives, sort_order) VALUES   ('094c49bd-2294-4948-824b-f5e5f91abe95', 'e4a67a42-3715-4298-b434-0358876d3978', 'Élevés de mollets', '', 'reps', 4, 15, 25, 60, '', '[]'::jsonb, 1);

INSERT INTO public.workout_templates (id, day_of_week, title, category, duration_min, description, warmup, optional_cardio) VALUES ('d3939e25-9ec5-4eb6-bbc2-f9717d926020', 6, 'LEGS + Skills — HSPU + Tuck flag', 'legs_skills', 47, 'jambes · core 360 · skills', '["Jumping jacks ou high knees 30-60s", "balancements jambes + fentes dynamiques", "10 squats légers", "10 pompes légères"]'::jsonb, '{}'::jsonb);
  INSERT INTO public.exercise_templates (id, workout_template_id, name, muscle_group, type, sets, reps_min, reps_max, rest_seconds, instructions, alternatives, sort_order) VALUES   ('099b4664-e380-40a5-99f4-02fe278c239a', 'd3939e25-9ec5-4eb6-bbc2-f9717d926020', 'Handstand libre', 'jambes', 'time', 10, 6, 10, 60, '', '[]'::jsonb, 0);
  INSERT INTO public.exercise_templates (id, workout_template_id, name, muscle_group, type, sets, reps_min, reps_max, rest_seconds, instructions, alternatives, sort_order) VALUES   ('a51a1240-d990-4d9f-9283-a4ac071b8bfe', 'd3939e25-9ec5-4eb6-bbc2-f9717d926020', 'HSPU au mur', 'jambes', 'reps', 4, 4, 7, 120, '', '[]'::jsonb, 1);
  INSERT INTO public.exercise_templates (id, workout_template_id, name, muscle_group, type, sets, reps_min, reps_max, rest_seconds, instructions, alternatives, sort_order) VALUES   ('79c5380d-d8fe-42af-8982-6f5eb4b7b5fd', 'd3939e25-9ec5-4eb6-bbc2-f9717d926020', 'Tuck flag', 'jambes', 'time', 5, 8, 15, 120, '', '[]'::jsonb, 2);
  INSERT INTO public.exercise_templates (id, workout_template_id, name, muscle_group, type, sets, reps_min, reps_max, rest_seconds, instructions, alternatives, sort_order) VALUES   ('6182537a-dada-42dc-b3ea-b089acda9b4d', 'd3939e25-9ec5-4eb6-bbc2-f9717d926020', 'Planche latérale lestée', 'jambes', 'time', 4, 40, 55, 60, '', '[]'::jsonb, 3);
  INSERT INTO public.exercise_templates (id, workout_template_id, name, muscle_group, type, sets, reps_min, reps_max, rest_seconds, instructions, alternatives, sort_order) VALUES   ('1072fe54-ca1c-415b-afc5-a9f160557429', 'd3939e25-9ec5-4eb6-bbc2-f9717d926020', 'Dragon flag', 'jambes', 'reps', 3, 5, 8, 90, '', '[]'::jsonb, 4);
  INSERT INTO public.exercise_templates (id, workout_template_id, name, muscle_group, type, sets, reps_min, reps_max, rest_seconds, instructions, alternatives, sort_order) VALUES   ('a39c83d8-0485-4ad8-bd04-4e3fadea9ce7', 'd3939e25-9ec5-4eb6-bbc2-f9717d926020', 'Squats poids du corps / jump squats', 'jambes', 'reps', 4, 12, 20, 120, '', '[]'::jsonb, 5);
  INSERT INTO public.exercise_templates (id, workout_template_id, name, muscle_group, type, sets, reps_min, reps_max, rest_seconds, instructions, alternatives, sort_order) VALUES   ('463cba9a-4d75-43e3-8650-3c090902dec1', 'd3939e25-9ec5-4eb6-bbc2-f9717d926020', 'Fentes marchées ou inversées', 'jambes', 'reps', 4, 10, 12, 120, '', '[]'::jsonb, 6);
  INSERT INTO public.exercise_templates (id, workout_template_id, name, muscle_group, type, sets, reps_min, reps_max, rest_seconds, instructions, alternatives, sort_order) VALUES   ('675eed71-dcec-45b4-b7d2-0167aa064f7c', 'd3939e25-9ec5-4eb6-bbc2-f9717d926020', 'Bulgarian split squats', 'jambes', 'reps', 4, 8, 12, 120, '', '[]'::jsonb, 7);
  INSERT INTO public.exercise_templates (id, workout_template_id, name, muscle_group, type, sets, reps_min, reps_max, rest_seconds, instructions, alternatives, sort_order) VALUES   ('80c082c6-e5be-4aa3-8200-dc0af43b253d', 'd3939e25-9ec5-4eb6-bbc2-f9717d926020', 'Pistol squat progression', 'jambes', 'reps', 3, 5, 8, 120, '', '[]'::jsonb, 8);
  INSERT INTO public.exercise_templates (id, workout_template_id, name, muscle_group, type, sets, reps_min, reps_max, rest_seconds, instructions, alternatives, sort_order) VALUES   ('33e0697a-081c-4721-b7d8-5de751261e7b', 'd3939e25-9ec5-4eb6-bbc2-f9717d926020', 'Pont fessier / Hip thrusts', 'jambes', 'reps', 4, 12, 15, 90, '', '[]'::jsonb, 9);
  INSERT INTO public.exercise_templates (id, workout_template_id, name, muscle_group, type, sets, reps_min, reps_max, rest_seconds, instructions, alternatives, sort_order) VALUES   ('d2491d0d-d17b-4a22-87b0-91b3e0d4d8d1', 'd3939e25-9ec5-4eb6-bbc2-f9717d926020', 'Élevés de mollets', 'jambes', 'reps', 4, 15, 25, 60, '', '[]'::jsonb, 10);
  INSERT INTO public.exercise_templates (id, workout_template_id, name, muscle_group, type, sets, reps_min, reps_max, rest_seconds, instructions, alternatives, sort_order) VALUES   ('7dd9d328-e99b-4670-96ce-83f9701ac6f9', 'd3939e25-9ec5-4eb6-bbc2-f9717d926020', 'Mountain climbers', 'jambes', 'time', 3, 30, 45, 60, '', '[]'::jsonb, 11);
  INSERT INTO public.exercise_templates (id, workout_template_id, name, muscle_group, type, sets, reps_min, reps_max, rest_seconds, instructions, alternatives, sort_order) VALUES   ('3e5f36c7-4828-4a44-ac26-e1c00482306b', 'd3939e25-9ec5-4eb6-bbc2-f9717d926020', 'L-sit progression', 'jambes', 'time', 3, 5, 25, 90, '', '[]'::jsonb, 12);

INSERT INTO public.workout_templates (id, day_of_week, title, category, duration_min, description, warmup, optional_cardio) VALUES ('17a9e60f-1248-4c68-8751-4e4ae20d964d', 7, 'Repos complet', 'rest', 15, 'Repos complet', '[]'::jsonb, '{}'::jsonb);
  INSERT INTO public.exercise_templates (id, workout_template_id, name, type, sets, sort_order) VALUES   ('d6411391-8837-43b2-933a-78b2275bc6a9', '17a9e60f-1248-4c68-8751-4e4ae20d964d', 'Récupération obligatoire', 'time', 1, 0);
  INSERT INTO public.exercise_templates (id, workout_template_id, name, type, sets, sort_order) VALUES   ('44300dac-1a49-4b95-8436-20adbafc0de4', '17a9e60f-1248-4c68-8751-4e4ae20d964d', 'Marche légère optionnelle 20-30 min', 'time', 1, 1);
  INSERT INTO public.exercise_templates (id, workout_template_id, name, type, sets, sort_order) VALUES   ('6b8582ea-9bd7-4c48-9fc1-30ab0e73220c', '17a9e60f-1248-4c68-8751-4e4ae20d964d', 'Étirements + mobilité 10-15 min : poitrine, épaules, ischios, hanches', 'time', 1, 2);


-- 6. Supabase Storage Setup for Progress Photos
-- Ensure the private progress-photos bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('progress-photos', 'progress-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Security Policies for progress-photos bucket
-- Note: (storage.foldername(name))[1] extracts the user's ID because files are uploaded as: {user_id}/{filename}

CREATE POLICY "Allow authenticated users to upload progress photos under their own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'progress-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Allow authenticated users to read their own progress photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'progress-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Allow authenticated users to delete their own progress photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'progress-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Allow authenticated users to update their own progress photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'progress-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'progress-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
