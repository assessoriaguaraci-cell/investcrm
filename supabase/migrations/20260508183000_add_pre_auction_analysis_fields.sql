-- Migration to add pre-auction analysis fields
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS bill_due_date DATE,
ADD COLUMN IF NOT EXISTS current_bid NUMERIC,
ADD COLUMN IF NOT EXISTS market_value NUMERIC,
ADD COLUMN IF NOT EXISTS property_conditions TEXT,
ADD COLUMN IF NOT EXISTS registry_analysis TEXT,
ADD COLUMN IF NOT EXISTS legal_analysis TEXT,
ADD COLUMN IF NOT EXISTS neighborhood_security TEXT,
ADD COLUMN IF NOT EXISTS neighborhood_amenities TEXT,
ADD COLUMN IF NOT EXISTS occupant_contact TEXT,
ADD COLUMN IF NOT EXISTS syndic_contact TEXT,
ADD COLUMN IF NOT EXISTS admin_contact TEXT;

-- Update labels or comments if needed
COMMENT ON COLUMN properties.bill_due_date IS 'Data de vencimento do boleto';
COMMENT ON COLUMN properties.current_bid IS 'Lance atual no leilão';
COMMENT ON COLUMN properties.market_value IS 'Valor de mercado estimado';
