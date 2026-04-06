
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('branch_manager', 'gm', 'owner');

-- Create branches table
CREATE TABLE public.branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  branch_id UUID REFERENCES public.branches(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer functions (avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.get_user_branch_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT branch_id FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Branches policies
CREATE POLICY "Authenticated users can view branches" ON public.branches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners can manage branches" ON public.branches FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can update branches" ON public.branches FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can delete branches" ON public.branches FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'owner'));

-- User roles policies
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Owners can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'owner'));

-- Create daily_reports table
CREATE TABLE public.daily_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  nakit_tahsilat NUMERIC NOT NULL DEFAULT 0,
  kredi_karti NUMERIC NOT NULL DEFAULT 0,
  multinet NUMERIC NOT NULL DEFAULT 0,
  ticket NUMERIC NOT NULL DEFAULT 0,
  sodexo NUMERIC NOT NULL DEFAULT 0,
  setcard NUMERIC NOT NULL DEFAULT 0,
  paye_kart NUMERIC NOT NULL DEFAULT 0,
  metropol_kart NUMERIC NOT NULL DEFAULT 0,
  online_odeme NUMERIC NOT NULL DEFAULT 0,
  labcoin NUMERIC NOT NULL DEFAULT 0,
  toplam_ciro NUMERIC NOT NULL DEFAULT 0,
  simpra_toplami NUMERIC NOT NULL DEFAULT 0,
  ciro_simpra_fark NUMERIC NOT NULL DEFAULT 0,
  kasa_avansi NUMERIC NOT NULL DEFAULT 0,
  kasa_devir NUMERIC NOT NULL DEFAULT 0,
  toplam_kasa_bakiye NUMERIC NOT NULL DEFAULT 0,
  masraf NUMERIC NOT NULL DEFAULT 0,
  bankaya_yatan NUMERIC NOT NULL DEFAULT 0,
  net_kasa_bakiye NUMERIC NOT NULL DEFAULT 0,
  z_raporu_toplami NUMERIC NOT NULL DEFAULT 0,
  z_raporu_fark NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(branch_id, date)
);
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reports" ON public.daily_reports FOR SELECT TO authenticated USING (
  branch_id = public.get_user_branch_id(auth.uid())
  OR public.has_role(auth.uid(), 'gm')
  OR public.has_role(auth.uid(), 'owner')
);

CREATE POLICY "Branch managers can insert own branch reports" ON public.daily_reports FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'branch_manager')
  AND branch_id = public.get_user_branch_id(auth.uid())
  AND user_id = auth.uid()
);

CREATE POLICY "Branch managers can update own branch reports" ON public.daily_reports FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'branch_manager')
  AND branch_id = public.get_user_branch_id(auth.uid())
  AND user_id = auth.uid()
);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_daily_reports_updated_at
  BEFORE UPDATE ON public.daily_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
