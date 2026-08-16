-- roles
CREATE TYPE public.app_role AS ENUM ('admin','user');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  access_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.has_active_access(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin')
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _user_id AND p.access_expires_at > now());
$$;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "roles read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;

  IF lower(NEW.email) = 'greenoddsvip@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- codes
CREATE TABLE public.codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  booking_code text NOT NULL,
  bookmaker text NOT NULL DEFAULT 'SportyBet',
  total_odds numeric,
  description text,
  kickoff_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.codes TO authenticated;
GRANT ALL ON public.codes TO service_role;
ALTER TABLE public.codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "codes read for active users" ON public.codes FOR SELECT TO authenticated
  USING (public.has_active_access(auth.uid()));
CREATE POLICY "admins manage codes" ON public.codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.code_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES public.codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.code_likes TO authenticated;
GRANT ALL ON public.code_likes TO service_role;
ALTER TABLE public.code_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes read" ON public.code_likes FOR SELECT TO authenticated
  USING (public.has_active_access(auth.uid()));
CREATE POLICY "likes insert own" ON public.code_likes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.has_active_access(auth.uid()));
CREATE POLICY "likes delete own" ON public.code_likes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE public.code_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES public.codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.code_comments TO authenticated;
GRANT ALL ON public.code_comments TO service_role;
ALTER TABLE public.code_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments read" ON public.code_comments FOR SELECT TO authenticated
  USING (public.has_active_access(auth.uid()));
CREATE POLICY "comments insert own" ON public.code_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.has_active_access(auth.uid()));
CREATE POLICY "comments delete own or admin" ON public.code_comments FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- payments
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 1500,
  sender_name text NOT NULL,
  reference text,
  note text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments read own or admin" ON public.payments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "payments insert own" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "payments admin update" ON public.payments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- approving a payment grants 10 days access
CREATE OR REPLACE FUNCTION public.grant_access_on_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND COALESCE(OLD.status,'') <> 'approved' THEN
    UPDATE public.profiles
      SET access_expires_at = GREATEST(COALESCE(access_expires_at, now()), now()) + interval '10 days'
      WHERE id = NEW.user_id;
    NEW.reviewed_at := now();
  ELSIF NEW.status = 'rejected' AND COALESCE(OLD.status,'') <> 'rejected' THEN
    NEW.reviewed_at := now();
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER payments_approval BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.grant_access_on_approval();