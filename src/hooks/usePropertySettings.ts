import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/integrations/supabase/client";

export interface PropertyCardSettings {
  size: "small" | "medium" | "large";
  showPhoto: boolean;
  showPriority: boolean;
  showLocation: boolean;
  showNeighborhood: boolean;
  showStatus: boolean;
  showAuctionDate: boolean;
  showFinancial: boolean;
  showResponsible: boolean;
}

interface PropertySettingsStore extends PropertyCardSettings {
  setCardSize: (size: "small" | "medium" | "large") => void;
  toggleField: (field: keyof PropertyCardSettings) => void;
  loadFromCloud: (userId: string) => Promise<void>;
}

export const usePropertySettings = create<PropertySettingsStore>()(
  persist(
    (set, get) => ({
      size: "medium",
      showPhoto: true,
      showPriority: true,
      showLocation: true,
      showNeighborhood: true,
      showStatus: true,
      showAuctionDate: true,
      showFinancial: true,
      showResponsible: true,

      setCardSize: async (size) => {
        set({ size });
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from("profiles").select("ui_settings").eq("user_id", user.id).single();
          const currentCloud = (profile?.ui_settings as any) || {};

          const local = { ...get() };
          delete (local as any).setCardSize;
          delete (local as any).toggleField;
          delete (local as any).loadFromCloud;
          
          await supabase.from("profiles").update({ 
            ui_settings: { ...currentCloud, property_settings: local } 
          }).eq("user_id", user.id);
        }
      },

      toggleField: async (field) => {
        const newState = { [field]: !get()[field] };
        set(newState);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from("profiles").select("ui_settings").eq("user_id", user.id).single();
          const currentCloud = (profile?.ui_settings as any) || {};

          const local = { ...get() };
          delete (local as any).setCardSize;
          delete (local as any).toggleField;
          delete (local as any).loadFromCloud;
          
          await supabase.from("profiles").update({ 
            ui_settings: { ...currentCloud, property_settings: local } 
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
          const settings = (data.ui_settings as any).property_settings;
          if (settings) set(settings);
        }
      }
    }),
    {
      name: "crm-property-settings",
    }
  )
);
