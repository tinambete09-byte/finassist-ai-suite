
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.template_kind AS ENUM ('email', 'meeting', 'report', 'client_comm');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'done');
CREATE TYPE public.email_tone AS ENUM ('formal', 'friendly', 'persuasive', 'concise');

-- Helper: updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  firm TEXT,
  job_title TEXT,
  region TEXT NOT NULL DEFAULT 'ZA',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- TEMPLATES
CREATE TABLE public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.template_kind NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.templates TO authenticated;
GRANT ALL ON public.templates TO service_role;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates_all_own" ON public.templates FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_templates_updated BEFORE UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TASKS
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  priority public.task_priority NOT NULL DEFAULT 'medium',
  status public.task_status NOT NULL DEFAULT 'todo',
  due_date DATE,
  client_name TEXT,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_all_own" ON public.tasks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- EMAIL DRAFTS
CREATE TABLE public.email_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  prompt TEXT NOT NULL,
  tone public.email_tone NOT NULL DEFAULT 'formal',
  mode TEXT NOT NULL DEFAULT 'generate',
  result TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_drafts TO authenticated;
GRANT ALL ON public.email_drafts TO service_role;
ALTER TABLE public.email_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "email_drafts_all_own" ON public.email_drafts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- SUMMARIES
CREATE TABLE public.summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_title TEXT NOT NULL,
  source_text TEXT NOT NULL,
  summary TEXT,
  key_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  action_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  risks JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.summaries TO authenticated;
GRANT ALL ON public.summaries TO service_role;
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "summaries_all_own" ON public.summaries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- REPORTS
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  meeting_date DATE,
  agenda TEXT,
  notes TEXT,
  content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_all_own" ON public.reports FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_reports_updated BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- KNOWLEDGE CHATS
CREATE TABLE public.knowledge_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_chats TO authenticated;
GRANT ALL ON public.knowledge_chats TO service_role;
ALTER TABLE public.knowledge_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "knowledge_chats_all_own" ON public.knowledge_chats FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_knowledge_chats_updated BEFORE UPDATE ON public.knowledge_chats FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.knowledge_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.knowledge_chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_messages TO authenticated;
GRANT ALL ON public.knowledge_messages TO service_role;
ALTER TABLE public.knowledge_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "knowledge_messages_all_own" ON public.knowledge_messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_knowledge_messages_chat ON public.knowledge_messages(chat_id, created_at);

-- ACTIVITY LOG
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  summary TEXT NOT NULL,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_log_all_own" ON public.activity_log FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_activity_log_user_time ON public.activity_log(user_id, created_at DESC);
