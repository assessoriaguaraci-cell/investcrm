
-- ================================================
-- ENUMS
-- ================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'gestor', 'comercial', 'operacoes', 'leitura');

CREATE TYPE public.property_stage AS ENUM (
  'pre_arrematacao', 'documentacao', 'desocupacao', 'reforma', 'venda', 'pos_venda', 'ir', 'finalizado'
);

CREATE TYPE public.property_type AS ENUM (
  'casa', 'casa_condominio', 'apartamento', 'apartamento_condominio', 'terreno', 'comercial'
);

CREATE TYPE public.occupation_status AS ENUM (
  'venda_para_ocupante', 'desocupado', 'imissao_na_posse', 'ocupado'
);

CREATE TYPE public.priority_level AS ENUM ('baixa', 'media', 'alta');

CREATE TYPE public.client_pipeline AS ENUM ('inicial', 'aprovacao_credito', 'financiamento', 'credito_reprovado');

CREATE TYPE public.client_stage AS ENUM (
  'chegada_lead', 'em_triagem', 'interessados', 'aguardando_atendimento', 'em_atendimento', 'lead_qualificado',
  'orientacao_financiamento', 'aguardando_documentacao', 'documentacao_incompleta', 'aguardando_analise_credito', 'credito_aprovado', 'cliente_com_pendencia', 'credito_reprovado',
  'aguardando_prioridade', 'agendamento_visitas', 'aguardando_ccv', 'aguardando_reserva', 'aguardando_contrato_caixa', 'em_registro', 'venda_concretizada', 'venda_cancelada',
  'credito_reprovado_pipe', 'documentacao_atualizada', 'reaprovacao_credito', 'credito_aprovado_pipe'
);

CREATE TYPE public.lead_temperature AS ENUM ('frio', 'morno', 'quente');

CREATE TYPE public.link_status AS ENUM (
  'interessado', 'contatado', 'visita', 'proposta_enviada', 'contraproposta', 'recusou', 'fechado'
);

CREATE TYPE public.payment_method AS ENUM ('a_vista', 'financiado', 'misto');

CREATE TYPE public.work_regime AS ENUM ('clt', 'autonomo', 'funcionario_publico', 'aposentado', 'bolsa_familia', 'outro');

CREATE TYPE public.activity_status AS ENUM ('pendente', 'feito', 'atrasado');

-- ================================================
-- PROFILES
-- ================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ================================================
-- USER ROLES
-- ================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ================================================
-- LEAD SOURCES
-- ================================================
CREATE TABLE public.lead_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view lead sources" ON public.lead_sources
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage lead sources" ON public.lead_sources
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Seed default sources
INSERT INTO public.lead_sources (name) VALUES
  ('Meta Ads'), ('Orgânico'), ('Indicação'), ('OLX'), ('Zap Imóveis'), ('Site'), ('WhatsApp'), ('Outro');

-- ================================================
-- PROPERTIES
-- ================================================
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  -- Address
  address TEXT,
  city TEXT,
  state TEXT NOT NULL DEFAULT '',
  neighborhood TEXT,
  zip_code TEXT,
  maps_url TEXT,
  -- Type and details
  property_type property_type NOT NULL DEFAULT 'casa',
  area_total NUMERIC,
  area_useful NUMERIC,
  has_condo BOOLEAN NOT NULL DEFAULT false,
  condo_value NUMERIC DEFAULT 0,
  occupation_status occupation_status NOT NULL DEFAULT 'desocupado',
  -- Financial
  purchase_price NUMERIC DEFAULT 0,
  documentation_cost NUMERIC DEFAULT 0,
  itbi_cost NUMERIC DEFAULT 0,
  registration_cost NUMERIC DEFAULT 0,
  eviction_cost NUMERIC DEFAULT 0,
  renovation_cost NUMERIC DEFAULT 0,
  other_costs NUMERIC DEFAULT 0,
  listed_price NUMERIC DEFAULT 0,
  final_sale_price NUMERIC,
  sale_date DATE,
  sale_payment_method payment_method,
  buyer_client_id UUID,
  -- Dates
  auction_date DATE,
  possession_date DATE,
  renovation_start DATE,
  renovation_end DATE,
  listing_date DATE,
  -- Controls
  stage property_stage NOT NULL DEFAULT 'pre_arrematacao',
  priority priority_level NOT NULL DEFAULT 'media',
  responsible_user_id UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view properties" ON public.properties
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert properties" ON public.properties
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update properties" ON public.properties
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete properties" ON public.properties
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ================================================
-- CLIENTS
-- ================================================
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Personal
  full_name TEXT NOT NULL,
  cpf TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  city TEXT,
  state TEXT,
  -- Financial / Credit
  income NUMERIC,
  income_composition TEXT,
  has_fgts BOOLEAN DEFAULT false,
  fgts_above_300 BOOLEAN DEFAULT false,
  has_dependents BOOLEAN DEFAULT false,
  dependents_count INTEGER DEFAULT 0,
  has_children BOOLEAN DEFAULT false,
  children_count INTEGER DEFAULT 0,
  marital_status TEXT,
  can_compose_income BOOLEAN DEFAULT false,
  income_composer_relation TEXT,
  has_financial_pending BOOLEAN DEFAULT false,
  financial_pending_description TEXT,
  work_regime work_regime,
  -- Commercial
  lead_source_id UUID REFERENCES public.lead_sources(id),
  campaign TEXT,
  ad_set TEXT,
  ad_name TEXT,
  temperature lead_temperature NOT NULL DEFAULT 'frio',
  responsible_user_id UUID REFERENCES auth.users(id),
  notes TEXT,
  -- Pipeline
  pipeline client_pipeline NOT NULL DEFAULT 'inicial',
  stage client_stage NOT NULL DEFAULT 'chegada_lead',
  lost_reason TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view clients" ON public.clients
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert clients" ON public.clients
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update clients" ON public.clients
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete clients" ON public.clients
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ================================================
-- CLIENT ↔ PROPERTY LINKS (Many-to-Many)
-- ================================================
CREATE TABLE public.client_property_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  status link_status NOT NULL DEFAULT 'interessado',
  proposal_value NUMERIC,
  proposal_date DATE,
  notes TEXT,
  responsible_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, property_id)
);

ALTER TABLE public.client_property_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view links" ON public.client_property_links
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert links" ON public.client_property_links
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update links" ON public.client_property_links
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete links" ON public.client_property_links
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ================================================
-- PROPERTY DOCUMENTS
-- ================================================
CREATE TABLE public.property_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'outro',
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.property_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view property docs" ON public.property_documents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert property docs" ON public.property_documents
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can delete property docs" ON public.property_documents
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ================================================
-- CLIENT DOCUMENTS
-- ================================================
CREATE TABLE public.client_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'outro',
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view client docs" ON public.client_documents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert client docs" ON public.client_documents
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can delete client docs" ON public.client_documents
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ================================================
-- ACTIVITIES
-- ================================================
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  due_date DATE,
  status activity_status NOT NULL DEFAULT 'pendente',
  activity_type TEXT NOT NULL DEFAULT 'tarefa',
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  responsible_user_id UUID NOT NULL REFERENCES auth.users(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view activities" ON public.activities
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert activities" ON public.activities
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update activities" ON public.activities
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete activities" ON public.activities
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ================================================
-- AUDIT LOGS
-- ================================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  changes JSONB,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view audit logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (true);

-- ================================================
-- PROPERTY CHECKLIST ITEMS
-- ================================================
CREATE TABLE public.property_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  stage property_stage NOT NULL,
  group_name TEXT NOT NULL,
  task_name TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.property_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view checklist" ON public.property_checklist_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert checklist" ON public.property_checklist_items
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update checklist" ON public.property_checklist_items
  FOR UPDATE TO authenticated USING (true);

-- ================================================
-- TRIGGER: Auto-create profile on signup
-- ================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ================================================
-- TRIGGER: Update updated_at
-- ================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_links_updated_at BEFORE UPDATE ON public.client_property_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================
-- SEQUENCE for property codes
-- ================================================
CREATE SEQUENCE IF NOT EXISTS public.property_code_seq START WITH 1;

CREATE OR REPLACE FUNCTION public.generate_property_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := 'IL-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD(nextval('public.property_code_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_property_code
  BEFORE INSERT ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_property_code();
