-- Skill States Migration : notes & statuts des skills callisthénie par utilisateur
-- (dernière donnée encore stockée uniquement en localStorage)

CREATE TABLE IF NOT EXISTS public.skill_states (
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  skill_id TEXT NOT NULL,
  status TEXT CHECK (status IN ('non commencé', 'en cours', 'proche', 'validé', 'auto')),
  note TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, skill_id)
);

ALTER TABLE public.skill_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own skill states"
  ON public.skill_states FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
