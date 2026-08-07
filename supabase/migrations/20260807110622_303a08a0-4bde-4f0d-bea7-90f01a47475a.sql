-- 1. Roles
CREATE TYPE public.app_role AS ENUM ('candidate', 'recruiter', 'admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "claim own role" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND role <> 'admin'::public.app_role);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 2. CVs: multi-CV, ATS breakdown, prediction
ALTER TABLE public.cvs
  ADD COLUMN label text,
  ADD COLUMN is_primary boolean NOT NULL DEFAULT false,
  ADD COLUMN language text NOT NULL DEFAULT 'fr',
  ADD COLUMN ats_breakdown jsonb,
  ADD COLUMN prediction jsonb,
  ADD COLUMN learning_plan jsonb,
  ADD COLUMN source_cv_id uuid REFERENCES public.cvs(id) ON DELETE SET NULL,
  ADD COLUMN is_anonymous boolean NOT NULL DEFAULT false;

-- 3. Jobs: advanced search fields + publishing
ALTER TABLE public.jobs
  ADD COLUMN remote text,
  ADD COLUMN visa_sponsorship boolean NOT NULL DEFAULT false,
  ADD COLUMN required_language text,
  ADD COLUMN salary_min integer,
  ADD COLUMN salary_currency text,
  ADD COLUMN skills text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN experience_min integer,
  ADD COLUMN deadline date,
  ADD COLUMN is_published boolean NOT NULL DEFAULT false,
  ADD COLUMN company_id uuid;

DROP POLICY IF EXISTS "read demo jobs" ON public.jobs;
CREATE POLICY "read visible jobs" ON public.jobs
  FOR SELECT TO authenticated
  USING (is_demo = true OR auth.uid() = user_id OR is_published = true);

-- 4. Applications: pipeline, CV used, recruiter access
ALTER TABLE public.applications
  ADD COLUMN cv_id uuid REFERENCES public.cvs(id) ON DELETE SET NULL,
  ADD COLUMN stage text NOT NULL DEFAULT 'new',
  ADD COLUMN recruiter_note text,
  ADD COLUMN match_score integer,
  ADD COLUMN match_breakdown jsonb,
  ADD COLUMN match_reasoning text,
  ADD COLUMN follow_up_at timestamptz;

CREATE POLICY "recruiter reads applications on own jobs" ON public.applications
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = applications.job_id AND j.user_id = auth.uid()));

CREATE POLICY "recruiter updates applications on own jobs" ON public.applications
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = applications.job_id AND j.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = applications.job_id AND j.user_id = auth.uid()));

CREATE POLICY "recruiter reads attached cvs" ON public.cvs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE a.cv_id = cvs.id AND j.user_id = auth.uid()
  ));

CREATE POLICY "recruiter reads applicant profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE a.user_id = profiles.id AND j.user_id = auth.uid()
  ));

-- 5. AI Career Agent missions
CREATE TABLE public.agent_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cv_id uuid REFERENCES public.cvs(id) ON DELETE SET NULL,
  title text NOT NULL,
  target_role text,
  countries text[] NOT NULL DEFAULT '{}'::text[],
  cities text[] NOT NULL DEFAULT '{}'::text[],
  remote_only boolean NOT NULL DEFAULT false,
  visa_required boolean NOT NULL DEFAULT false,
  salary_min integer,
  languages text[] NOT NULL DEFAULT '{}'::text[],
  contract_type text,
  min_score integer NOT NULL DEFAULT 80,
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_missions TO authenticated;
GRANT ALL ON public.agent_missions TO service_role;
ALTER TABLE public.agent_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own missions" ON public.agent_missions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER agent_missions_updated_at BEFORE UPDATE ON public.agent_missions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Smart alerts
CREATE TABLE public.agent_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id uuid REFERENCES public.agent_missions(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mission_id, job_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_alerts TO authenticated;
GRANT ALL ON public.agent_alerts TO service_role;
ALTER TABLE public.agent_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own alerts" ON public.agent_alerts
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. Company profiles
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  website text,
  country text,
  city text,
  industry text,
  size text,
  description text,
  technologies text[] NOT NULL DEFAULT '{}'::text[],
  culture text,
  salary_range text,
  rating numeric(2,1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read companies" ON public.companies
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert own company" ON public.companies
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "update own company" ON public.companies
  FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "delete own company" ON public.companies
  FOR DELETE TO authenticated USING (auth.uid() = owner_id);
CREATE TRIGGER companies_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX idx_applications_job_id ON public.applications(job_id);
CREATE INDEX idx_jobs_published ON public.jobs(is_published) WHERE is_published = true;
CREATE INDEX idx_agent_alerts_user ON public.agent_alerts(user_id, is_read);