
CREATE TABLE public.template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  version int NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX template_versions_template_id_idx ON public.template_versions(template_id, version DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_versions TO authenticated;
GRANT ALL ON public.template_versions TO service_role;

ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own template versions"
ON public.template_versions FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
