import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { ClientFilterValues, EMPTY_CLIENT_FILTERS } from '@/components/clients/ClientFilters';

interface ClientFiltersState {
  activeFilters: ClientFilterValues;
  setActiveFilters: (filters: ClientFilterValues) => void;
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
      setActiveFilters: (filters) => set({ activeFilters: sanitizeClientFilters(filters) }),
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
        }
      },
      saveToCloud: async (userId) => {
        const { activeFilters } = get();
        const { data: profile } = await supabase.from('profiles').select('ui_settings').eq('user_id', userId).single();
        const currentCloud = (profile?.ui_settings as any) || {};

        await supabase
          .from('profiles')
          .update({ 
            ui_settings: { ...currentCloud, active_client_filters: activeFilters } 
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
