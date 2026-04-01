
-- Migrate existing properties from documentacao to itbi_contrato
UPDATE public.properties SET stage = 'itbi_contrato' WHERE stage = 'documentacao';

-- Migrate stage history
UPDATE public.property_stage_history SET stage = 'itbi_contrato' WHERE stage = 'documentacao';

-- Migrate checklist items
UPDATE public.property_checklist_items SET stage = 'itbi_contrato' WHERE stage = 'documentacao';
