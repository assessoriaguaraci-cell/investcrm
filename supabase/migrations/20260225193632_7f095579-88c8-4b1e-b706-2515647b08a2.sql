
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS appraisal_expiry date DEFAULT NULL;

COMMENT ON COLUMN public.properties.appraisal_expiry IS 'Data de vencimento do laudo de avaliação';
