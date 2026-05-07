-- Update Pre-Auction Properties table to align with main Properties table
CREATE TABLE IF NOT EXISTS public.pre_auction_funnels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pre_auction_properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_id UUID REFERENCES public.pre_auction_funnels(id) ON DELETE SET NULL,
    stage TEXT NOT NULL DEFAULT 'inicial', -- 'inicial', 'em_andamento', 'concluido', 'cancelado', 'arrematado'
    
    -- Main Identification (Matches properties table)
    code TEXT NOT NULL,
    photo_url TEXT,
    property_type TEXT DEFAULT 'casa', -- casa, apartamento, etc
    state TEXT,
    city TEXT,
    neighborhood TEXT,
    address TEXT,
    zip_code TEXT,
    maps_url TEXT,
    drive_url TEXT,
    
    -- Auction and Acquisition
    auction_date DATE,
    auction_type TEXT, -- a_vista, financiado
    origin TEXT, -- caixa, emgea, etc
    purchase_price NUMERIC, -- Valor Arrematação
    current_bid NUMERIC, -- Lance Atual (for pre-auction tracking)
    proposal_date DATE,
    proposal_deadline DATE,
    
    -- Physical Details
    area_total NUMERIC,
    area_useful NUMERIC,
    property_division TEXT, -- Divisão (ex: 2 quartos)
    landmark TEXT, -- Ponto de referência
    occupation_status TEXT DEFAULT 'ocupado', -- ocupado, desocupado
    
    -- Financials / Evaluation
    appraisal_value NUMERIC, -- Valor do Laudo
    market_value NUMERIC, -- Valor de Mercado
    appraisal_validity DATE,
    listed_price NUMERIC, -- Valor de Venda pretendido
    
    -- Responsible
    responsible_id UUID REFERENCES public.profiles(id),
    operation_responsible_id UUID REFERENCES public.profiles(id),
    
    -- Diligence (Specific to Pre-Auction)
    diligence_date DATE,
    diligence_professional_id UUID REFERENCES public.city_contacts(id),
    diligence_samples TEXT,
    status_diligence TEXT DEFAULT 'Não Iniciado',
    status_market_analysis TEXT DEFAULT 'Não Iniciado',
    status_debts TEXT DEFAULT 'Não Iniciado',
    
    -- Detailed Analysis
    security_analysis TEXT,
    transport_analysis TEXT,
    complementary_analysis TEXT,
    
    -- Documentation
    registration_number TEXT,
    tax_id TEXT, -- Inscrição Imobiliária
    manager_contact TEXT, -- Contato Síndico/Adm
    iptu NUMERIC,
    condo_fees NUMERIC,
    
    -- Conclusion
    notes TEXT,
    conclusion TEXT,
    group_created BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.pre_auction_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_auction_properties ENABLE ROW LEVEL SECURITY;

-- Add explicit policies for better permission management
DROP POLICY IF EXISTS "All authenticated users can manage funnels" ON public.pre_auction_funnels;
CREATE POLICY "Enable manage funnels for authenticated users" ON public.pre_auction_funnels 
FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "All authenticated users can manage pre_auction_properties" ON public.pre_auction_properties;
CREATE POLICY "Enable select for authenticated users" ON public.pre_auction_properties FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON public.pre_auction_properties FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.pre_auction_properties FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON public.pre_auction_properties FOR DELETE USING (auth.role() = 'authenticated');
