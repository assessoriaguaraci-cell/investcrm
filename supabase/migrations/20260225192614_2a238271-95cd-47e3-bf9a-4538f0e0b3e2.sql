
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
