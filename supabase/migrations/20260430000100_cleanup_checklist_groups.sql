
-- Clean up checklist items that should no longer exist
DELETE FROM public.property_checklist_items 
WHERE group_name IN ('Estratégia Definida', 'Execução');

-- Clean up kanban_stages desocupacao checklist to only contain Diagnosis if needed
-- (Though hardcoded templates in checklist-templates.ts usually override this)
UPDATE public.kanban_stages 
SET checklist = '[{"title": "Diagnóstico", "items": ["Ocupação do imovel", "Informações do ocupante"]}]'::jsonb
WHERE value = 'desocupacao' AND funnel_type = 'property';
