import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';

export interface ClientFilterValues {
  search: string;
  temperature: string[];
  state: string[];
  city: string[];
  work_regime: string[];
  marital_status: string[];
  has_fgts: string[];
  has_financial_pending: string[];
  can_compose_income: string[];
  income_min: string;
  income_max: string;
  responsible_user_id: string[];
  tag: string;
  created_at_start: string;
  created_at_end: string;
}

export const EMPTY_CLIENT_FILTERS: ClientFilterValues = {
  search: "",
  temperature: [],
  state: [],
  city: [],
  work_regime: [],
  marital_status: [],
  has_fgts: [],
  has_financial_pending: [],
  can_compose_income: [],
  income_min: "",
  income_max: "",
  responsible_user_id: [],
  tag: "",
  created_at_start: "",
  created_at_end: "",
};

interface ClientFiltersState {
  activeFilters: ClientFilterValues;
  hiddenStages: string[];
  setActiveFilters: (filters: ClientFilterValues) => void;
  setHiddenStages: (stages: string[]) => void;
  toggleStageVisibility: (stageValue: string) => void;
  loadFromCloud: (userId: string) => Promise<void>;
  saveToCloud: (userId: string) => Promise<void>;
}

export const sanitizeClientFilters = (filters: any): ClientFilterValues => {
  const sanitized = { ...EMPTY_CLIENT_FILTERS };
  if (!filters || typeof filters !== 'object') return sanitized;

  Object.keys(EMPTY_CLIENT_FILTERS).forEach((key) => {
    const k = key as keyof ClientFilterValues;
    if (Array.isArray(EMPTY_CLIENT_FILTERS[k])) {
      // Ensure it's an array
      sanitized[k] = Array.isArray(filters[k]) ? filters[k] : [];
    } else {
      // Ensure it's a string/primitive as expected
      sanitized[k] = filters[k] !== undefined && filters[k] !== null ? filters[k] : EMPTY_CLIENT_FILTERS[k];
    }
  });

  return sanitized;
};

export const useClientFiltersStore = create<ClientFiltersState>()(
  persist(
    (set, get) => ({
      activeFilters: EMPTY_CLIENT_FILTERS,
      hiddenStages: [],
      setActiveFilters: (filters) => set({ activeFilters: sanitizeClientFilters(filters) }),
      setHiddenStages: (stages) => set({ hiddenStages: stages }),
      toggleStageVisibility: (stageValue) => set((state) => ({
        hiddenStages: state.hiddenStages.includes(stageValue)
          ? state.hiddenStages.filter(s => s !== stageValue)
          : [...state.hiddenStages, stageValue]
      })),
      loadFromCloud: async (userId) => {
        const { data, error } = await supabase
          .from('profiles')
          .select('ui_settings')
          .eq('user_id', userId)
          .single();

        if (!error && data?.ui_settings && typeof data.ui_settings === 'object') {
          const cloudFilters = (data.ui_settings as any).active_client_filters;
          if (cloudFilters) {
            set({ activeFilters: sanitizeClientFilters(cloudFilters) });
          }
          if ((data.ui_settings as any).hidden_client_stages) {
            set({ hiddenStages: (data.ui_settings as any).hidden_client_stages });
          }
        }
      },
        const { activeFilters, hiddenStages } = get();
        const { data: profile } = await supabase.from('profiles').select('ui_settings').eq('user_id', userId).single();
        const currentCloud = (profile?.ui_settings as any) || {};

        await supabase
          .from('profiles')
          .update({ 
            ui_settings: { 
              ...currentCloud, 
              active_client_filters: activeFilters,
              hidden_client_stages: hiddenStages
            } 
          })
          .eq('user_id', userId);
      },
    }),
    {
      name: 'client-filters-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
