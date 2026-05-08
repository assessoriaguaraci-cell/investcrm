export type PreAuctionStage = 'inicial' | 'em_andamento' | 'concluido' | 'cancelado' | 'arrematado';

export interface PreAuctionFunnel {
  id: string;
  name: string;
  created_at: string;
}

export interface PreAuctionProperty {
  id: string;
  funnel_id: string | null;
  stage: PreAuctionStage;
  
  // Main Identification
  code: string;
  photo_url: string | null;
  property_type: string;
  state: string | null;
  city: string | null;
  neighborhood: string | null;
  address: string | null;
  zip_code: string | null;
  maps_url: string | null;
  drive_url: string | null;
  
  // Auction and Acquisition
  auction_date: string | null;
  auction_type: string | null;
  origin: string | null;
  purchase_price: number | null;
  current_bid: number | null;
  proposal_date: string | null;
  proposal_deadline: string | null;
  
  // Physical Details
  area_total: number | null;
  area_useful: number | null;
  property_division: string | null;
  landmark: string | null;
  occupation_status: string | null;
  
  // Financials / Evaluation
  appraisal_value: number | null;
  market_value: number | null;
  appraisal_validity: string | null;
  listed_price: number | null;
  
  // Responsible
  responsible_id: string | null;
  operation_responsible_id: string | null;
  
  // Diligence
  diligence_date: string | null;
  diligence_professional_id: string | null;
  diligence_samples: string | null;
  status_diligence: string;
  status_market_analysis: string;
  status_debts: string;
  
  // Detailed Analysis
  security_analysis: string | null;
  transport_analysis: string | null;
  complementary_analysis: string | null;
  
  // Documentation
  registration_number: string | null;
  tax_id: string | null;
  manager_contact: string | null;
  iptu: number | null;
  condo_fees: number | null;
  
  // Conclusion
  notes: string | null;
  conclusion: string | null;
  group_created: boolean;
  
  // New Analysis Fields
  bill_due_date: string | null;
  property_conditions: string | null;
  registry_analysis: string | null;
  legal_analysis: string | null;
  occupant_contact: string | null;
  syndic_contact: string | null;
  itbi: number | null;
  
  created_at: string;
  updated_at: string;
  
  responsible?: { full_name: string };
  operation_responsible?: { full_name: string };
}
