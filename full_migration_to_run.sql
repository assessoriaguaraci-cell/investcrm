
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

-- Enable pg_cron and pg_net extensions for scheduled edge function calls
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
-- Add approval status to profiles
ALTER TABLE public.profiles ADD COLUMN status text NOT NULL DEFAULT 'approved';

-- Update existing profiles to approved so current users aren't locked out
UPDATE public.profiles SET status = 'approved';

-- Update the handle_new_user trigger to set status as approved
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, status)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'approved');
  RETURN NEW;
END;
$$;

-- Add drive_url and photo_url to properties
ALTER TABLE public.properties ADD COLUMN drive_url text;
ALTER TABLE public.properties ADD COLUMN photo_url text;

-- Create property_stage_history table
CREATE TABLE public.property_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  stage text NOT NULL,
  entered_at timestamp with time zone NOT NULL DEFAULT now(),
  exited_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.property_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view stage history"
  ON public.property_stage_history FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert stage history"
  ON public.property_stage_history FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update stage history"
  ON public.property_stage_history FOR UPDATE USING (true);

-- Trigger to auto-track stage changes
CREATE OR REPLACE FUNCTION public.track_property_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    -- Close previous stage entry
    UPDATE public.property_stage_history
    SET exited_at = now()
    WHERE property_id = NEW.id AND exited_at IS NULL;

    -- Insert new stage entry
    INSERT INTO public.property_stage_history (property_id, stage, entered_at)
    VALUES (NEW.id, NEW.stage, now());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER track_stage_change
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.track_property_stage_change();

-- Also insert initial stage history for new properties
CREATE OR REPLACE FUNCTION public.init_property_stage_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.property_stage_history (property_id, stage, entered_at)
  VALUES (NEW.id, NEW.stage, now());
  RETURN NEW;
END;
$$;

CREATE TRIGGER init_stage_history
  AFTER INSERT ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.init_property_stage_history();

-- Saved filters table
CREATE TABLE public.saved_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  entity_type text NOT NULL DEFAULT 'properties',
  filters jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved filters"
  ON public.saved_filters FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own saved filters"
  ON public.saved_filters FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own saved filters"
  ON public.saved_filters FOR DELETE USING (user_id = auth.uid());

-- Storage bucket for property photos
INSERT INTO storage.buckets (id, name, public) VALUES ('property-photos', 'property-photos', true);

CREATE POLICY "Anyone can view property photos"
  ON storage.objects FOR SELECT USING (bucket_id = 'property-photos');

CREATE POLICY "Authenticated users can upload property photos"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'property-photos');

CREATE POLICY "Authenticated users can update property photos"
  ON storage.objects FOR UPDATE USING (bucket_id = 'property-photos');

CREATE POLICY "Authenticated users can delete property photos"
  ON storage.objects FOR DELETE USING (bucket_id = 'property-photos');

-- Table for weekly property updates
CREATE TABLE public.property_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  update_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.property_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view property updates"
  ON public.property_updates FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert property updates"
  ON public.property_updates FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update property updates"
  ON public.property_updates FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete property updates"
  ON public.property_updates FOR DELETE
  USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_property_updates_updated_at
  BEFORE UPDATE ON public.property_updates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.property_updates
  ADD COLUMN stage text,
  ADD COLUMN days_since_auction integer;

-- 1. Tighten activities SELECT policy to restrict access
DROP POLICY IF EXISTS "Authenticated users can view activities" ON public.activities;
CREATE POLICY "Users can view relevant activities"
  ON public.activities
  FOR SELECT
  USING (
    created_by = auth.uid()
    OR responsible_user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gestor'::app_role)
  );

-- 2. Tighten activities UPDATE policy
DROP POLICY IF EXISTS "Authenticated users can update activities" ON public.activities;
CREATE POLICY "Users can update relevant activities"
  ON public.activities
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR responsible_user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gestor'::app_role)
  );

-- 3. Tighten activities INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert activities" ON public.activities;
CREATE POLICY "Authenticated users can insert activities"
  ON public.activities
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Add input validation constraints on clients table
ALTER TABLE public.clients
  ADD CONSTRAINT clients_full_name_length CHECK (length(full_name) <= 255),
  ADD CONSTRAINT clients_phone_length CHECK (phone IS NULL OR length(phone) <= 30),
  ADD CONSTRAINT clients_email_length CHECK (email IS NULL OR length(email) <= 255),
  ADD CONSTRAINT clients_cpf_length CHECK (cpf IS NULL OR length(cpf) BETWEEN 11 AND 18);

-- 5. Add input validation constraints on properties table
ALTER TABLE public.properties
  ADD CONSTRAINT properties_code_length CHECK (length(code) <= 50),
  ADD CONSTRAINT properties_address_length CHECK (address IS NULL OR length(address) <= 500);

-- 6. Sanitize handle_new_user to truncate full_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, status)
  VALUES (
    NEW.id,
    COALESCE(substring(NEW.raw_user_meta_data->>'full_name', 1, 255), ''),
    'pending'
  );
  RETURN NEW;
END;
$$;

-- Fix: Restrict client SELECT to assigned users, admin, and gestor
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;

CREATE POLICY "Users can view assigned clients"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'gestor')
    OR responsible_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.activities
      WHERE activities.client_id = clients.id
      AND (activities.responsible_user_id = auth.uid() OR activities.created_by = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.client_property_links
      WHERE client_property_links.client_id = clients.id
      AND client_property_links.responsible_user_id = auth.uid()
    )
  );

-- Fix: Restrict client UPDATE to assigned users, admin, and gestor
DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clients;

CREATE POLICY "Users can update assigned clients"
  ON public.clients
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'gestor')
    OR responsible_user_id = auth.uid()
  );

-- Fix: Restrict client INSERT to require auth
DROP POLICY IF EXISTS "Authenticated users can insert clients" ON public.clients;

CREATE POLICY "Authenticated users can insert clients"
  ON public.clients
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Revenue (Faturamento) fields
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS sale_value_roi numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS financing_value numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS down_payment_value numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subsidy_value numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cashback_value numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS income_tax_value numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sale_documentation_cost numeric DEFAULT 0;

-- Investment fields (new ones not already in schema)
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS contract_cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iptu_debts numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS condo_debts numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS maintenance_cost numeric DEFAULT 0;

-- Monthly expenses
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS condo_monthly numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS caretaker_monthly numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iptu_monthly numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS utilities_monthly numeric DEFAULT 0;

-- Shareholders / Quota
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS num_shareholders integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS guaraci_share_pct numeric DEFAULT 100;

ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS appraisal_expiry date DEFAULT NULL;

COMMENT ON COLUMN public.properties.appraisal_expiry IS 'Data de vencimento do laudo de avaliação';

-- Add new enum values for property_stage
ALTER TYPE public.property_stage ADD VALUE IF NOT EXISTS 'itbi_contrato';
ALTER TYPE public.property_stage ADD VALUE IF NOT EXISTS 'registro';

-- Migrate existing properties from documentacao to itbi_contrato
UPDATE public.properties SET stage = 'itbi_contrato' WHERE stage = 'documentacao';

-- Migrate stage history
UPDATE public.property_stage_history SET stage = 'itbi_contrato' WHERE stage = 'documentacao';

-- Migrate checklist items
UPDATE public.property_checklist_items SET stage = 'itbi_contrato' WHERE stage = 'documentacao';

-- City information table for map feature
CREATE TABLE public.city_info (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  state TEXT NOT NULL,
  city TEXT NOT NULL,
  best_neighborhoods TEXT,
  worst_neighborhoods TEXT,
  considerations TEXT,
  dangerous_regions TEXT,
  where_sold TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(state, city)
);

-- Enable RLS
ALTER TABLE public.city_info ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view city info"
ON public.city_info FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert city info"
ON public.city_info FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update city info"
ON public.city_info FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Timestamp trigger
CREATE TRIGGER update_city_info_updated_at
BEFORE UPDATE ON public.city_info
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Table for city contacts (diligents, city halls, etc.)
CREATE TABLE public.city_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city_info_id UUID NOT NULL REFERENCES public.city_info(id) ON DELETE CASCADE,
  contact_type TEXT NOT NULL, -- 'diligente', 'prefeitura', 'outro'
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.city_contacts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view city contacts"
ON public.city_contacts FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert city contacts"
ON public.city_contacts FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update city contacts"
ON public.city_contacts FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete city contacts"
ON public.city_contacts FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Timestamp trigger
CREATE TRIGGER update_city_contacts_updated_at
BEFORE UPDATE ON public.city_contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Execute este script no SQL Editor do Supabase para aplicar a nova tabela
-- de parceiros
ALTER TABLE public.city_contacts
  ADD COLUMN IF NOT EXISTS has_served BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pix_key TEXT;

-- Migration to support dynamic Kanban columns
-- Created: 2026-02-27

-- 1. Create kanban_stages table
CREATE TABLE IF NOT EXISTS public.kanban_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_type TEXT NOT NULL, -- 'property' or 'client'
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  color TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  pipeline TEXT, -- used for clients
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (funnel_type, value)
);

-- 2. Enable RLS
ALTER TABLE public.kanban_stages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can view kanban stages" 
    ON public.kanban_stages FOR SELECT TO authenticated USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can manage kanban stages" 
    ON public.kanban_stages FOR ALL TO authenticated USING (true); -- Allowing authenticated for now as requested for "+" button ease
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Update existing tables to use TEXT for stage (to allow dynamic addition)
ALTER TABLE public.properties ALTER COLUMN stage TYPE TEXT;
ALTER TABLE public.clients ALTER COLUMN stage TYPE TEXT;

-- 4. Seed initial Property Stages
INSERT INTO public.kanban_stages (funnel_type, value, label, color, sort_order) 
VALUES
  ('property', 'pre_arrematacao', 'Pré-Arrematação', 'bg-[hsl(var(--stage-pre-auction))]', 10),
  ('property', 'itbi_contrato', 'ITBI/Contrato', 'bg-[hsl(var(--stage-itbi-contract))]', 20),
  ('property', 'registro', 'Registro', 'bg-[hsl(var(--stage-registration))]', 30),
  ('property', 'desocupacao', 'Desocupação', 'bg-[hsl(var(--stage-eviction))]', 40),
  ('property', 'reforma', 'Reforma', 'bg-[hsl(var(--stage-renovation))]', 50),
  ('property', 'venda', 'Venda', 'bg-[hsl(var(--stage-sale))]', 60),
  ('property', 'pos_venda', 'Pós-Venda', 'bg-[hsl(var(--stage-post-sale))]', 70),
  ('property', 'ir', 'IR', 'bg-[hsl(var(--stage-tax))]', 80),
  ('property', 'finalizado', 'Finalizado', 'bg-[hsl(var(--stage-finished))]', 90)
ON CONFLICT (funnel_type, value) DO NOTHING;

-- 5. Seed initial Client Stages
INSERT INTO public.kanban_stages (funnel_type, value, label, color, sort_order, pipeline) 
VALUES
  ('client', 'chegada_lead', 'Chegada do Lead', 'bg-[hsl(var(--stage-new-lead))]', 10, 'inicial'),
  ('client', 'em_triagem', 'Em Triagem', 'bg-[hsl(var(--stage-screening))]', 20, 'inicial'),
  ('client', 'interessados', 'Interessados', 'bg-[hsl(var(--stage-interested))]', 30, 'inicial'),
  ('client', 'aguardando_atendimento', 'Aguardando Atendimento', 'bg-[hsl(var(--stage-waiting))]', 40, 'inicial'),
  ('client', 'em_atendimento', 'Em Atendimento', 'bg-[hsl(var(--stage-in-service))]', 50, 'inicial'),
  ('client', 'lead_qualificado', 'Lead Qualificado', 'bg-[hsl(var(--stage-qualified))]', 60, 'inicial'),
  ('client', 'orientacao_financiamento', 'Orientação Financiamento', 'bg-[hsl(var(--stage-interested))]', 110, 'aprovacao_credito'),
  ('client', 'aguardando_documentacao', 'Aguardando Documentação', 'bg-[hsl(var(--stage-waiting))]', 120, 'aprovacao_credito'),
  ('client', 'documentacao_incompleta', 'Documentação Incompleta', 'bg-[hsl(var(--stage-in-service))]', 130, 'aprovacao_credito'),
  ('client', 'aguardando_analise_credito', 'Aguardando Análise de Crédito', 'bg-[hsl(var(--stage-screening))]', 140, 'aprovacao_credito'),
  ('client', 'credito_aprovado', 'Crédito Aprovado', 'bg-[hsl(var(--stage-credit-approved))]', 150, 'aprovacao_credito'),
  ('client', 'cliente_com_pendencia', 'Cliente com Pendência', 'bg-[hsl(var(--stage-waiting))]', 160, 'aprovacao_credito'),
  ('client', 'credito_reprovado', 'Crédito Reprovado', 'bg-[hsl(var(--stage-credit-rejected))]', 170, 'aprovacao_credito'),
  ('client', 'aguardando_prioridade', 'Aguardando Prioridade', 'bg-[hsl(var(--stage-waiting))]', 210, 'financiamento'),
  ('client', 'agendamento_visitas', 'Agendamento de Visitas', 'bg-[hsl(var(--stage-interested))]', 220, 'financiamento'),
  ('client', 'aguardando_ccv', 'Aguardando CCV', 'bg-[hsl(var(--stage-screening))]', 230, 'financiamento'),
  ('client', 'aguardando_reserva', 'Aguardando Reserva', 'bg-[hsl(var(--stage-in-service))]', 240, 'financiamento'),
  ('client', 'aguardando_contrato_caixa', 'Aguardando Contrato Caixa', 'bg-[hsl(var(--stage-financing))]', 250, 'financiamento'),
  ('client', 'em_registro', 'Em Registro', 'bg-[hsl(var(--stage-qualified))]', 260, 'financiamento'),
  ('client', 'venda_concretizada', 'Venda Concretizada', 'bg-[hsl(var(--stage-closed))]', 270, 'financiamento'),
  ('client', 'venda_cancelada', 'Venda Cancelada', 'bg-[hsl(var(--stage-lost))]', 280, 'financiamento'),
  ('client', 'credito_reprovado_pipe', 'Crédito Reprovado', 'bg-[hsl(var(--stage-credit-rejected))]', 310, 'credito_reprovado'),
  ('client', 'documentacao_atualizada', 'Documentação Atualizada', 'bg-[hsl(var(--stage-interested))]', 320, 'credito_reprovado'),
  ('client', 'reaprovacao_credito', 'Reaprovação de Crédito', 'bg-[hsl(var(--stage-screening))]', 330, 'credito_reprovado'),
  ('client', 'credito_aprovado_pipe', 'Crédito Aprovado', 'bg-[hsl(var(--stage-credit-approved))]', 340, 'credito_reprovado')
ON CONFLICT (funnel_type, value) DO NOTHING;
