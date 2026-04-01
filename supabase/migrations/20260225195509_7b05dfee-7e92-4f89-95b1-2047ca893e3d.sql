
-- Add new enum values for property_stage
ALTER TYPE public.property_stage ADD VALUE IF NOT EXISTS 'itbi_contrato';
ALTER TYPE public.property_stage ADD VALUE IF NOT EXISTS 'registro';
