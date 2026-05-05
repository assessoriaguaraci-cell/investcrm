import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/integrations/supabase/client";
import { EMPTY_FILTERS, type PropertyFilterValues } from "@/components/properties/PropertyFilters";

interface PropertyFiltersStore {
  filters: PropertyFilterValues;
  setFilters: (filters: PropertyFilterValues) => Promise<void>;
  loadFromCloud: (userId: string) => Promise<void>;
}

export const usePropertyFiltersStore = create<PropertyFiltersStore>()(
  persist(
    (set, get) => ({
      filters: EMPTY_FILTERS,

      setFilters: async (filters) => {
        set({ filters });
        
        // Debounce cloud sync could be added here, but for now let's sync
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from("profiles").select("ui_settings").eq("user_id", user.id).single();
          const currentCloud = (profile?.ui_settings as any) || {};

          await supabase.from("profiles").update({ 
            ui_settings: { ...currentCloud, active_property_filters: filters } 
          }).eq("user_id", user.id);
        }
      },

      loadFromCloud: async (userId) => {
        const { data, error } = await supabase
          .from("profiles")
          .select("ui_settings")
          .eq("user_id", userId)
          .single();
        
        if (!error && data?.ui_settings && typeof data.ui_settings === 'object') {
          const cloudFilters = (data.ui_settings as any).active_property_filters;
          if (cloudFilters) {
            // Sanitize cloud filters to match current schema
            const sanitized = { ...EMPTY_FILTERS, ...cloudFilters };
            const arrayFields: (keyof PropertyFilterValues)[] = [
              "stage", "property_type", "state", "city", "priority", 
              "occupation_status", "responsible_user_id", "operation_responsible_id"
            ];
            arrayFields.forEach(field => {
              if (!Array.isArray(sanitized[field])) {
                sanitized[field] = sanitized[field] ? [sanitized[field] as any] : [];
              }
            });
            set({ filters: sanitized });
          }
        }
      }
    }),
    {
      name: "crm-active-property-filters",
    }
  )
);
