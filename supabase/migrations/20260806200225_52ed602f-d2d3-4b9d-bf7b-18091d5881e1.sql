
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  domain TEXT,
  experience_years INTEGER DEFAULT 0,
  countries TEXT[] DEFAULT '{}',
  city TEXT,
  desired_salary TEXT,
  languages TEXT[] DEFAULT '{}',
  contract_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.cvs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT,
  raw_text TEXT,
  analysis JSONB,
  global_score INTEGER,
  ats_score INTEGER,
  readability_score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cvs TO authenticated;
GRANT ALL ON public.cvs TO service_role;
ALTER TABLE public.cvs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cvs" ON public.cvs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  country TEXT,
  salary TEXT,
  contract_type TEXT,
  level TEXT,
  source TEXT,
  url TEXT,
  description TEXT,
  posted_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read demo jobs" ON public.jobs FOR SELECT TO authenticated USING (is_demo = true OR auth.uid() = user_id);
CREATE POLICY "insert own jobs" ON public.jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND is_demo = false);
CREATE POLICY "update own jobs" ON public.jobs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own jobs" ON public.jobs FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cv_id UUID NOT NULL REFERENCES public.cvs(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  breakdown JSONB,
  reasoning TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cv_id, job_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matches TO authenticated;
GRANT ALL ON public.matches TO service_role;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own matches" ON public.matches FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cv_id UUID REFERENCES public.cvs(id) ON DELETE SET NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  doc_type TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'fr',
  title TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own documents" ON public.documents FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'applied',
  notes TEXT,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, job_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own applications" ON public.applications FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.jobs (is_demo, title, company, location, country, salary, contract_type, level, source, url, description, posted_at) VALUES
(true, 'Ingénieur Développement Python', 'Vermeg', 'Tunis', 'Tunisie', '2 500 - 3 200 TND', 'CDI', 'Confirmé (2-5 ans)', 'TanitJobs', 'https://www.tanitjobs.com', 'Développement de services backend en Python (FastAPI), PostgreSQL, Docker. Bonne maîtrise du français et de l''anglais requise. Expérience en API REST et tests unitaires.', CURRENT_DATE - 2),
(true, 'Développeur Full Stack React / Node', 'Talan Tunisie', 'Ariana', 'Tunisie', '2 000 - 2 800 TND', 'CDI', 'Junior (1-3 ans)', 'Keejob', 'https://www.keejob.com', 'React, TypeScript, Node.js, PostgreSQL. Méthodologie Agile. Anglais technique. Équipe internationale.', CURRENT_DATE - 5),
(true, 'Ingénieur Mécanique - Bureau d''études', 'Sofitec', 'Sousse', 'Tunisie', '1 800 - 2 400 TND', 'CDI', 'Confirmé (3-5 ans)', 'Emploitic', 'https://www.emploitic.com', 'Conception mécanique sur CATIA V5 / SolidWorks, calculs de structure, suivi de production. Français courant.', CURRENT_DATE - 8),
(true, 'Stage PFE - Machine Learning', 'InstaDeep', 'Tunis', 'Tunisie', 'Indemnité 800 TND', 'Stage / PFE', 'Débutant', 'LinkedIn', 'https://www.linkedin.com/jobs', 'Stage de fin d''études sur des modèles NLP et systèmes de recommandation. Python, PyTorch, SentenceTransformers.', CURRENT_DATE - 1),
(true, 'Data Engineer', 'Capgemini', 'Paris', 'France', '45 000 - 55 000 € / an', 'CDI', 'Confirmé (3-6 ans)', 'Indeed', 'https://fr.indeed.com', 'Pipelines de données Spark/Airflow, cloud Azure, SQL avancé. Français courant, anglais professionnel.', CURRENT_DATE - 3),
(true, 'Développeur Backend Python (H/F)', 'Doctolib', 'Nantes', 'France', '48 000 - 60 000 € / an', 'CDI', 'Confirmé (4+ ans)', 'Welcome to the Jungle', 'https://www.welcometothejungle.com', 'Python, Django/FastAPI, PostgreSQL, Kubernetes. Culture produit forte, télétravail hybride.', CURRENT_DATE - 6),
(true, 'Ingénieur Électrique - Automatismes', 'Siemens', 'Munich', 'Allemagne', '55 000 - 68 000 € / an', 'CDI', 'Confirmé (3-5 ans)', 'Monster', 'https://www.monster.de', 'Automatisation industrielle, SIMATIC S7, TIA Portal. Allemand B2 minimum et anglais courant exigés.', CURRENT_DATE - 4),
(true, 'Software Engineer (Relocation Allemagne)', 'Zalando', 'Berlin', 'Allemagne', '65 000 - 80 000 € / an', 'CDI', 'Confirmé (3+ ans)', 'Glassdoor', 'https://www.glassdoor.de', 'Java ou Python, microservices, AWS. Anglais courant suffisant, allemand apprécié. Visa et relocation pris en charge.', CURRENT_DATE - 7),
(true, 'Mechanical Design Engineer', 'Bombardier', 'Montréal', 'Canada', '75 000 - 90 000 CAD / an', 'CDI', 'Confirmé (5+ ans)', 'Indeed', 'https://ca.indeed.com', 'Conception aéronautique, CATIA, tolérancement GD&T. Bilingue français/anglais. Permis de travail requis.', CURRENT_DATE - 9),
(true, 'IT Support & Network Engineer', 'Emirates Group', 'Dubaï', 'Émirats Arabes Unis', '12 000 - 16 000 AED / mois', 'CDI', 'Confirmé (3-5 ans)', 'Bayt', 'https://www.bayt.com', 'Administration réseau Cisco, support N2/N3, ITIL. Anglais courant obligatoire. Logement et transport fournis.', CURRENT_DATE - 3),
(true, 'Développeur Mobile Flutter', 'Digitalents', 'Sfax', 'Tunisie', '1 900 - 2 600 TND', 'CDI', 'Junior (1-3 ans)', 'TanitJobs', 'https://www.tanitjobs.com', 'Applications Flutter Android/iOS, Firebase, REST API. Portfolio d''applications publiées apprécié.', CURRENT_DATE - 2),
(true, 'Alternance Ingénieur DevOps', 'Orange', 'Lyon', 'France', '1 400 € / mois', 'Alternance', 'Débutant', 'Apec', 'https://www.apec.fr', 'CI/CD GitLab, Docker, Kubernetes, Terraform. Formation d''ingénieur en cours. Français courant.', CURRENT_DATE - 1);
