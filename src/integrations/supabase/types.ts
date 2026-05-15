export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_type: string
          client_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string
          due_date: string | null
          id: string
          notes: string | null
          property_id: string | null
          responsible_user_id: string
          status: Database["public"]["Enums"]["activity_status"]
          updated_at: string
        }
        Insert: {
          activity_type?: string
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          description: string
          due_date?: string | null
          id?: string
          notes?: string | null
          property_id?: string | null
          responsible_user_id: string
          status?: Database["public"]["Enums"]["activity_status"]
          updated_at?: string
        }
        Update: {
          activity_type?: string
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          property_id?: string | null
          responsible_user_id?: string
          status?: Database["public"]["Enums"]["activity_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          changes: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      city_contacts: {
        Row: {
          city_info_id: string
          contact_type: string
          created_at: string
          email: string | null
          has_served: boolean
          id: string
          name: string
          notes: string | null
          phone: string | null
          pix_key: string | null
          updated_at: string
        }
        Insert: {
          city_info_id: string
          contact_type: string
          created_at?: string
          email?: string | null
          has_served?: boolean
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          pix_key?: string | null
          updated_at?: string
        }
        Update: {
          city_info_id?: string
          contact_type?: string
          created_at?: string
          email?: string | null
          has_served?: boolean
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          pix_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "city_contacts_city_info_id_fkey"
            columns: ["city_info_id"]
            isOneToOne: false
            referencedRelation: "city_info"
            referencedColumns: ["id"]
          },
        ]
      }
      city_info: {
        Row: {
          best_neighborhoods: string | null
          city: string
          considerations: string | null
          created_at: string
          dangerous_regions: string | null
          id: string
          state: string
          updated_at: string
          where_sold: string | null
          worst_neighborhoods: string | null
        }
        Insert: {
          best_neighborhoods?: string | null
          city: string
          considerations?: string | null
          created_at?: string
          dangerous_regions?: string | null
          id?: string
          state: string
          updated_at?: string
          where_sold?: string | null
          worst_neighborhoods?: string | null
        }
        Update: {
          best_neighborhoods?: string | null
          city?: string
          considerations?: string | null
          created_at?: string
          dangerous_regions?: string | null
          id?: string
          state?: string
          updated_at?: string
          where_sold?: string | null
          worst_neighborhoods?: string | null
        }
        Relationships: []
      }
      client_documents: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          document_type: string
          file_name: string
          file_url: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          document_type?: string
          file_name: string
          file_url: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          document_type?: string
          file_name?: string
          file_url?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_property_links: {
        Row: {
          client_id: string
          created_at: string
          id: string
          notes: string | null
          property_id: string
          proposal_date: string | null
          proposal_value: number | null
          responsible_user_id: string | null
          status: Database["public"]["Enums"]["link_status"]
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          notes?: string | null
          property_id: string
          proposal_date?: string | null
          proposal_value?: number | null
          responsible_user_id?: string | null
          status?: Database["public"]["Enums"]["link_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          property_id?: string
          proposal_date?: string | null
          proposal_value?: number | null
          responsible_user_id?: string | null
          status?: Database["public"]["Enums"]["link_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_property_links_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_property_links_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          ad_name: string | null
          ad_set: string | null
          campaign: string | null
          can_compose_income: boolean | null
          children_count: number | null
          city: string | null
          cpf: string | null
          created_at: string
          dependents_count: number | null
          email: string | null
          fgts_above_300: boolean | null
          financial_pending_description: string | null
          full_name: string
          has_children: boolean | null
          has_dependents: boolean | null
          has_fgts: boolean | null
          has_financial_pending: boolean | null
          id: string
          income: number | null
          income_composer_relation: string | null
          income_composition: string | null
          lead_source_id: string | null
          lost_reason: string | null
          marital_status: string | null
          notes: string | null
          phone: string | null
          pipeline: Database["public"]["Enums"]["client_pipeline"]
          responsible_user_id: string | null
          stage: Database["public"]["Enums"]["client_stage"]
          state: string | null
          temperature: Database["public"]["Enums"]["lead_temperature"]
          updated_at: string
          whatsapp: string | null
          work_regime: Database["public"]["Enums"]["work_regime"] | null
          tags: string[] | null
        }
        Insert: {
          ad_name?: string | null
          ad_set?: string | null
          campaign?: string | null
          can_compose_income?: boolean | null
          children_count?: number | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          dependents_count?: number | null
          email?: string | null
          fgts_above_300?: boolean | null
          financial_pending_description?: string | null
          full_name: string
          has_children?: boolean | null
          has_dependents?: boolean | null
          has_fgts?: boolean | null
          has_financial_pending?: boolean | null
          id?: string
          income?: number | null
          income_composer_relation?: string | null
          income_composition?: string | null
          lead_source_id?: string | null
          lost_reason?: string | null
          marital_status?: string | null
          notes?: string | null
          phone?: string | null
          pipeline?: Database["public"]["Enums"]["client_pipeline"]
          responsible_user_id?: string | null
          stage?: Database["public"]["Enums"]["client_stage"]
          state?: string | null
          temperature?: Database["public"]["Enums"]["lead_temperature"]
          updated_at?: string
          whatsapp?: string | null
          work_regime?: Database["public"]["Enums"]["work_regime"] | null
          tags?: string[] | null
        }
        Update: {
          ad_name?: string | null
          ad_set?: string | null
          campaign?: string | null
          can_compose_income?: boolean | null
          children_count?: number | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          dependents_count?: number | null
          email?: string | null
          fgts_above_300?: boolean | null
          financial_pending_description?: string | null
          full_name?: string
          has_children?: boolean | null
          has_dependents?: boolean | null
          has_fgts?: boolean | null
          has_financial_pending?: boolean | null
          id?: string
          income?: number | null
          income_composer_relation?: string | null
          income_composition?: string | null
          lead_source_id?: string | null
          lost_reason?: string | null
          marital_status?: string | null
          notes?: string | null
          phone?: string | null
          pipeline?: Database["public"]["Enums"]["client_pipeline"]
          responsible_user_id?: string | null
          stage?: Database["public"]["Enums"]["client_stage"]
          state?: string | null
          temperature?: Database["public"]["Enums"]["lead_temperature"]
          updated_at?: string
          whatsapp?: string | null
          work_regime?: Database["public"]["Enums"]["work_regime"] | null
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_lead_source_id_fkey"
            columns: ["lead_source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_stages: {
        Row: {
          checklist: Json | null
          color: string
          created_at: string
          funnel_id: string | null
          funnel_type: string
          id: string
          label: string
          pipeline: string | null
          sort_order: number
          value: string
        }
        Insert: {
          checklist?: Json | null
          color: string
          created_at?: string
          funnel_id?: string | null
          funnel_type: string
          id?: string
          label: string
          pipeline?: string | null
          sort_order: number
          value: string
        }
        Update: {
          checklist?: Json | null
          color?: string
          created_at?: string
          funnel_id?: string | null
          funnel_type?: string
          id?: string
          label?: string
          pipeline?: string | null
          sort_order?: number
          value?: string
        }
        Relationships: []
      }
      lead_sources: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          occupation: string | null
          phone: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          occupation?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          occupation?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pre_auction_files: {
        Row: {
          created_at: string
          file_name: string
          file_type: string
          file_url: string
          id: string
          property_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_type: string
          file_url: string
          id?: string
          property_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_type?: string
          file_url?: string
          id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pre_auction_files_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "pre_auction_properties"
            referencedColumns: ["id"]
          }
        ]
      }
      pre_auction_funnels: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      pre_auction_properties: {
        Row: {
          address: string | null
          appraisal_value: number | null
          auction_date: string | null
          auction_type: string | null
          bill_due_date: string | null
          city: string | null
          code: string
          complementary_analysis: string | null
          conclusion: string | null
          condo_fees: number | null
          created_at: string
          current_bid: number | null
          diligence_date: string | null
          diligence_professional_id: string | null
          diligence_samples: string | null
          drive_url: string | null
          funnel_id: string | null
          group_created: boolean
          id: string
          iptu: number | null
          itbi: number | null
          landmark: string | null
          legal_analysis: string | null
          listed_price: number | null
          manager_contact: string | null
          maps_url: string | null
          market_value: number | null
          neighborhood: string | null
          notes: string | null
          occupation_status: string | null
          occupant_contact: string | null
          operation_responsible_id: string | null
          origin: string | null
          photo_url: string | null
          property_conditions: string | null
          property_division: string | null
          property_type: string | null
          proposal_date: string | null
          proposal_deadline: string | null
          purchase_price: number | null
          registration_number: string | null
          registry_analysis: string | null
          responsible_id: string | null
          security_analysis: string | null
          stage: string
          state: string | null
          status_debts: string
          status_diligence: string
          status_market_analysis: string
          syndic_contact: string | null
          tax_id: string | null
          transport_analysis: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          appraisal_value?: number | null
          auction_date?: string | null
          auction_type?: string | null
          bill_due_date?: string | null
          city?: string | null
          code: string
          complementary_analysis?: string | null
          conclusion?: string | null
          condo_fees?: number | null
          created_at?: string
          current_bid?: number | null
          diligence_date?: string | null
          diligence_professional_id?: string | null
          diligence_samples?: string | null
          drive_url?: string | null
          funnel_id?: string | null
          group_created?: boolean
          id?: string
          iptu?: number | null
          itbi?: number | null
          landmark?: string | null
          legal_analysis?: string | null
          listed_price?: number | null
          manager_contact?: string | null
          maps_url?: string | null
          market_value?: number | null
          neighborhood?: string | null
          notes?: string | null
          occupation_status?: string | null
          occupant_contact?: string | null
          operation_responsible_id?: string | null
          origin?: string | null
          photo_url?: string | null
          property_conditions?: string | null
          property_division?: string | null
          property_type?: string | null
          proposal_date?: string | null
          proposal_deadline?: string | null
          purchase_price?: number | null
          registration_number?: string | null
          registry_analysis?: string | null
          responsible_id?: string | null
          security_analysis?: string | null
          stage?: string
          state?: string | null
          status_debts?: string
          status_diligence?: string
          status_market_analysis?: string
          syndic_contact?: string | null
          tax_id?: string | null
          transport_analysis?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          appraisal_value?: number | null
          auction_date?: string | null
          auction_type?: string | null
          bill_due_date?: string | null
          city?: string | null
          code?: string
          complementary_analysis?: string | null
          conclusion?: string | null
          condo_fees?: number | null
          created_at?: string
          current_bid?: number | null
          diligence_date?: string | null
          diligence_professional_id?: string | null
          diligence_samples?: string | null
          drive_url?: string | null
          funnel_id?: string | null
          group_created?: boolean
          id?: string
          iptu?: number | null
          itbi?: number | null
          landmark?: string | null
          legal_analysis?: string | null
          listed_price?: number | null
          manager_contact?: string | null
          maps_url?: string | null
          market_value?: number | null
          neighborhood?: string | null
          notes?: string | null
          occupation_status?: string | null
          occupant_contact?: string | null
          operation_responsible_id?: string | null
          origin?: string | null
          photo_url?: string | null
          property_conditions?: string | null
          property_division?: string | null
          property_type?: string | null
          proposal_date?: string | null
          proposal_deadline?: string | null
          purchase_price?: number | null
          registration_number?: string | null
          registry_analysis?: string | null
          responsible_id?: string | null
          security_analysis?: string | null
          stage?: string
          state?: string | null
          status_debts?: string
          status_diligence?: string
          status_market_analysis?: string
          syndic_contact?: string | null
          tax_id?: string | null
          transport_analysis?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pre_auction_properties_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "pre_auction_funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_auction_properties_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      properties: {
        Row: {
          address: string | null
          appraisal_expiry: string | null
          area_total: number | null
          area_useful: number | null
          auction_date: string | null
          buyer_client_id: string | null
          caretaker_monthly: number | null
          cashback_value: number | null
          city: string | null
          code: string
          condo_debts: number | null
          condo_monthly: number | null
          condo_value: number | null
          contract_cost: number | null
          created_at: string
          documentation_cost: number | null
          down_payment_value: number | null
          drive_url: string | null
          eviction_cost: number | null
          final_sale_price: number | null
          financing_value: number | null
          guaraci_share_pct: number | null
          has_condo: boolean
          id: string
          income_tax_value: number | null
          iptu_debts: number | null
          iptu_monthly: number | null
          itbi_cost: number | null
          listed_price: number | null
          listing_date: string | null
          maintenance_cost: number | null
          maps_url: string | null
          neighborhood: string | null
          notes: string | null
          num_shareholders: number | null
          occupation_status: Database["public"]["Enums"]["occupation_status"]
          other_costs: number | null
          photo_url: string | null
          possession_date: string | null
          priority: Database["public"]["Enums"]["priority_level"]
          property_type: Database["public"]["Enums"]["property_type"]
          purchase_price: number | null
          registration_cost: number | null
          renovation_cost: number | null
          renovation_end: string | null
          renovation_start: string | null
          responsible_user_id: string | null
          sale_date: string | null
          sale_documentation_cost: number | null
          sale_payment_method:
          | Database["public"]["Enums"]["payment_method"]
          | null
          sale_value_roi: number | null
          stage: Database["public"]["Enums"]["property_stage"]
          state: string
          subsidy_value: number | null
          updated_at: string
          utilities_monthly: number | null
          appraisal_date: string | null
          appraisal_notes: string | null
          appraisal_status: string | null
          auction_type: string | null
          broker_id: string | null
          caretaker_id: string | null
          caretaker_notes: string | null
          caretaker_payment_date: string | null
          cash_sale_discount: number | null
          cca_id: string | null
          has_broker: boolean | null
          landmark: string | null
          marketing_ad_copy: string | null
          marketing_banner: boolean | null
          marketing_banner_property: boolean | null
          marketing_board: boolean | null
          marketing_facebook_group: boolean | null
          marketing_flyer: boolean | null
          marketing_influencer: boolean | null
          marketing_paid_traffic: boolean | null
          marketing_smartlink: boolean | null
          marketing_whatsapp_group: boolean | null
          operation_responsible_id: string | null
          origin: string | null
          owner: string | null
          property_division: string | null
          registration_number: string | null
          sale_price: number | null
          sale_type: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          appraisal_expiry?: string | null
          area_total?: number | null
          area_useful?: number | null
          auction_date?: string | null
          buyer_client_id?: string | null
          caretaker_monthly?: number | null
          cashback_value?: number | null
          city?: string | null
          code: string
          condo_debts?: number | null
          condo_monthly?: number | null
          condo_value?: number | null
          contract_cost?: number | null
          created_at?: string
          documentation_cost?: number | null
          down_payment_value?: number | null
          drive_url?: string | null
          eviction_cost?: number | null
          final_sale_price?: number | null
          financing_value?: number | null
          guaraci_share_pct?: number | null
          has_condo?: boolean
          id?: string
          income_tax_value?: number | null
          iptu_debts?: number | null
          iptu_monthly?: number | null
          itbi_cost?: number | null
          listed_price?: number | null
          listing_date?: string | null
          maintenance_cost?: number | null
          maps_url?: string | null
          neighborhood?: string | null
          notes?: string | null
          num_shareholders?: number | null
          occupation_status?: Database["public"]["Enums"]["occupation_status"]
          other_costs?: number | null
          photo_url?: string | null
          possession_date?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          property_type?: Database["public"]["Enums"]["property_type"]
          purchase_price?: number | null
          registration_cost?: number | null
          renovation_cost?: number | null
          renovation_end?: string | null
          renovation_start?: string | null
          responsible_user_id?: string | null
          sale_date?: string | null
          sale_documentation_cost?: number | null
          sale_payment_method?:
          | Database["public"]["Enums"]["payment_method"]
          | null
          sale_value_roi?: number | null
          stage?: Database["public"]["Enums"]["property_stage"]
          state?: string
          subsidy_value?: number | null
          updated_at?: string
          utilities_monthly?: number | null
          appraisal_date?: string | null
          appraisal_notes?: string | null
          appraisal_status?: string | null
          auction_type?: string | null
          broker_id?: string | null
          caretaker_id?: string | null
          caretaker_notes?: string | null
          caretaker_payment_date?: string | null
          cash_sale_discount?: number | null
          cca_id?: string | null
          has_broker?: boolean | null
          landmark?: string | null
          marketing_ad_copy?: string | null
          marketing_banner?: boolean | null
          marketing_banner_property?: boolean | null
          marketing_board?: boolean | null
          marketing_facebook_group?: boolean | null
          marketing_flyer?: boolean | null
          marketing_influencer?: boolean | null
          marketing_paid_traffic?: boolean | null
          marketing_smartlink?: boolean | null
          marketing_whatsapp_group?: boolean | null
          operation_responsible_id?: string | null
          origin?: string | null
          owner?: string | null
          property_division?: string | null
          registration_number?: string | null
          sale_price?: number | null
          sale_type?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          appraisal_expiry?: string | null
          area_total?: number | null
          area_useful?: number | null
          auction_date?: string | null
          buyer_client_id?: string | null
          caretaker_monthly?: number | null
          cashback_value?: number | null
          city?: string | null
          code?: string
          condo_debts?: number | null
          condo_monthly?: number | null
          condo_value?: number | null
          contract_cost?: number | null
          created_at?: string
          documentation_cost?: number | null
          down_payment_value?: number | null
          drive_url?: string | null
          eviction_cost?: number | null
          final_sale_price?: number | null
          financing_value?: number | null
          guaraci_share_pct?: number | null
          has_condo?: boolean
          id?: string
          income_tax_value?: number | null
          iptu_debts?: number | null
          iptu_monthly?: number | null
          itbi_cost?: number | null
          listed_price?: number | null
          listing_date?: string | null
          maintenance_cost?: number | null
          maps_url?: string | null
          neighborhood?: string | null
          notes?: string | null
          num_shareholders?: number | null
          occupation_status?: Database["public"]["Enums"]["occupation_status"]
          other_costs?: number | null
          photo_url?: string | null
          possession_date?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          property_type?: Database["public"]["Enums"]["property_type"]
          purchase_price?: number | null
          registration_cost?: number | null
          renovation_cost?: number | null
          renovation_end?: string | null
          renovation_start?: string | null
          responsible_user_id?: string | null
          sale_date?: string | null
          sale_documentation_cost?: number | null
          sale_payment_method?:
          | Database["public"]["Enums"]["payment_method"]
          | null
          sale_value_roi?: number | null
          stage?: Database["public"]["Enums"]["property_stage"]
          state?: string
          subsidy_value?: number | null
          updated_at?: string
          utilities_monthly?: number | null
          appraisal_date?: string | null
          appraisal_notes?: string | null
          appraisal_status?: string | null
          auction_type?: string | null
          broker_id?: string | null
          caretaker_id?: string | null
          caretaker_notes?: string | null
          caretaker_payment_date?: string | null
          cash_sale_discount?: number | null
          cca_id?: string | null
          has_broker?: boolean | null
          landmark?: string | null
          marketing_ad_copy?: string | null
          marketing_banner?: boolean | null
          marketing_banner_property?: boolean | null
          marketing_board?: boolean | null
          marketing_facebook_group?: boolean | null
          marketing_flyer?: boolean | null
          marketing_influencer?: boolean | null
          marketing_paid_traffic?: boolean | null
          marketing_smartlink?: boolean | null
          marketing_whatsapp_group?: boolean | null
          operation_responsible_id?: string | null
          origin?: string | null
          owner?: string | null
          property_division?: string | null
          registration_number?: string | null
          sale_price?: number | null
          sale_type?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      property_checklist_items: {
        Row: {
          completed: boolean
          completed_at: string | null
          completed_by: string | null
          created_at: string
          group_name: string
          id: string
          notes: string | null
          pre_auction_property_id: string | null
          property_id: string | null
          sort_order: number
          stage: Database["public"]["Enums"]["property_stage"]
          task_name: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          group_name: string
          id?: string
          notes?: string | null
          pre_auction_property_id?: string | null
          property_id?: string | null
          sort_order?: number
          stage: Database["public"]["Enums"]["property_stage"]
          task_name: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          group_name?: string
          id?: string
          notes?: string | null
          pre_auction_property_id?: string | null
          property_id?: string | null
          sort_order?: number
          stage?: Database["public"]["Enums"]["property_stage"]
          task_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_checklist_items_pre_auction_property_id_fkey"
            columns: ["pre_auction_property_id"]
            isOneToOne: false
            referencedRelation: "pre_auction_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_checklist_items_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_documents: {
        Row: {
          created_at: string
          description: string | null
          document_type: string
          file_name: string
          file_url: string
          id: string
          property_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_type?: string
          file_name: string
          file_url: string
          id?: string
          property_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          document_type?: string
          file_name?: string
          file_url?: string
          id?: string
          property_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_funnels: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      property_stage_history: {
        Row: {
          created_at: string
          entered_at: string
          exited_at: string | null
          id: string
          property_id: string
          stage: string
        }
        Insert: {
          created_at?: string
          entered_at?: string
          exited_at?: string | null
          id?: string
          property_id: string
          stage: string
        }
        Update: {
          created_at?: string
          entered_at?: string
          exited_at?: string | null
          id?: string
          property_id?: string
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_stage_history_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_updates: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          days_since_auction: number | null
          id: string
          property_id: string
          stage: string | null
          update_date: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          days_since_auction?: number | null
          id?: string
          property_id: string
          stage?: string | null
          update_date?: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          days_since_auction?: number | null
          id?: string
          property_id?: string
          stage?: string | null
          update_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_updates_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_filters: {
        Row: {
          created_at: string
          entity_type: string
          filters: Json
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_type?: string
          filters?: Json
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_type?: string
          filters?: Json
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      activity_status: "pendente" | "feito" | "atrasado" | "em_andamento"
      app_role: "admin" | "gestor" | "comercial" | "operacoes" | "leitura"
      client_pipeline:
      | "inicial"
      | "aprovacao_credito"
      | "financiamento"
      | "credito_reprovado"
      client_stage:
      | "chegada_lead"
      | "em_triagem"
      | "interessados"
      | "aguardando_atendimento"
      | "em_atendimento"
      | "lead_qualificado"
      | "orientacao_financiamento"
      | "aguardando_documentacao"
      | "documentacao_incompleta"
      | "aguardando_analise_credito"
      | "credito_aprovado"
      | "cliente_com_pendencia"
      | "credito_reprovado"
      | "aguardando_prioridade"
      | "agendamento_visitas"
      | "aguardando_ccv"
      | "aguardando_reserva"
      | "aguardando_contrato_caixa"
      | "em_registro"
      | "venda_concretizada"
      | "venda_cancelada"
      | "credito_reprovado_pipe"
      | "documentacao_atualizada"
      | "reaprovacao_credito"
      | "credito_aprovado_pipe"
      lead_temperature: "frio" | "morno" | "quente"
      link_status:
      | "interessado"
      | "contatado"
      | "visita"
      | "proposta_enviada"
      | "contraproposta"
      | "recusou"
      | "fechado"
      occupation_status:
      | "venda_para_ocupante"
      | "desocupado"
      | "imissao_na_posse"
      | "ocupado"
      payment_method: "a_vista" | "financiado" | "misto"
      priority_level: "baixa" | "media" | "alta"
      property_stage:
      | "pre_arrematacao"
      | "documentacao"
      | "desocupacao"
      | "reforma"
      | "venda"
      | "pos_venda"
      | "ir"
      | "finalizado"
      | "itbi_contrato"
      | "registro"
      property_type:
      | "casa"
      | "casa_condominio"
      | "apartamento"
      | "apartamento_condominio"
      | "terreno"
      | "comercial"
      work_regime:
      | "clt"
      | "autonomo"
      | "funcionario_publico"
      | "aposentado"
      | "bolsa_familia"
      | "outro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
    DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
    DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema["Enums"]
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema["CompositeTypes"]
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {
      activity_status: ["pendente", "feito", "atrasado", "em_andamento"],
      app_role: ["admin", "gestor", "comercial", "operacoes", "leitura"],
      client_pipeline: [
        "inicial",
        "aprovacao_credito",
        "financiamento",
        "credito_reprovado",
      ],
      client_stage: [
        "chegada_lead",
        "em_triagem",
        "interessados",
        "aguardando_atendimento",
        "em_atendimento",
        "lead_qualificado",
        "orientacao_financiamento",
        "aguardando_documentacao",
        "documentacao_incompleta",
        "aguardando_analise_credito",
        "credito_aprovado",
        "cliente_com_pendencia",
        "credito_reprovado",
        "aguardando_prioridade",
        "agendamento_visitas",
        "aguardando_ccv",
        "aguardando_reserva",
        "aguardando_contrato_caixa",
        "em_registro",
        "venda_concretizada",
        "venda_cancelada",
        "credito_reprovado_pipe",
        "documentacao_atualizada",
        "reaprovacao_credito",
        "credito_aprovado_pipe",
      ],
      lead_temperature: ["frio", "morno", "quente"],
      link_status: [
        "interessado",
        "contatado",
        "visita",
        "proposta_enviada",
        "contraproposta",
        "recusou",
        "fechado",
      ],
      occupation_status: [
        "venda_para_ocupante",
        "desocupado",
        "imissao_na_posse",
        "ocupado",
      ],
      payment_method: ["a_vista", "financiado", "misto"],
      priority_level: ["baixa", "media", "alta"],
      property_stage: [
        "pre_arrematacao",
        "documentacao",
        "desocupacao",
        "reforma",
        "venda",
        "pos_venda",
        "ir",
        "finalizado",
        "itbi_contrato",
        "registro",
      ],
      property_type: [
        "casa",
        "casa_condominio",
        "apartamento",
        "apartamento_condominio",
        "terreno",
        "comercial",
      ],
      work_regime: [
        "clt",
        "autonomo",
        "funcionario_publico",
        "aposentado",
        "bolsa_familia",
        "outro",
      ],
    },
  },
} as const
