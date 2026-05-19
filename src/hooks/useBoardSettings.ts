import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/integrations/supabase/client";

interface BoardSettings {
    cardSize: "small" | "medium" | "large";
    showTags: boolean;
    showPhone: boolean;
    showIncome: boolean;
    showLocation: boolean;
    showCpf: boolean;
    showMaritalStatus: boolean;
    showWorkRegime: boolean;
    showPropertyLinks: boolean;
    customPhases: { name: string; value: string; color: string; }[];
    setCardSize: (size: "small" | "medium" | "large") => void;
    toggleField: (field: string) => void;
    addCustomPhase: (phase: { name: string; value: string; color: string; }) => void;
    removeCustomPhase: (value: string) => void;
    loadFromCloud: (userId: string) => Promise<void>;
}

export const useBoardSettings = create<BoardSettings>()(
    persist(
        (set, get) => ({
            cardSize: "medium",
            showTags: true,
            showPhone: true,
            showIncome: true,
            showLocation: true,
            showCpf: true,
            showMaritalStatus: true,
            showWorkRegime: true,
            showPropertyLinks: true,
            customPhases: [],
            
            setCardSize: async (cardSize) => {
                set({ cardSize });
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase.from("profiles").select("ui_settings").eq("user_id", user.id).single();
                    const currentCloud = (profile?.ui_settings as any) || {};
                    const local = { ...get() };
                    delete (local as any).setCardSize;
                    delete (local as any).toggleField;
                    delete (local as any).loadFromCloud;

                    await supabase.from("profiles").update({ 
                        ui_settings: { ...currentCloud, client_settings: local } 
                    }).eq("user_id", user.id);
                }
            },
            
            toggleField: async (field) => {
                const newState: any = { [field]: !((get() as any)[field]) };
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
                        ui_settings: { ...currentCloud, client_settings: local } 
                    }).eq("user_id", user.id);
                }
            },

            addCustomPhase: async (phase) => {
                const current = get().customPhases || [];
                if (!current.find(p => p.value === phase.value)) {
                    set({ customPhases: [...current, phase] });
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        const { data: profile } = await supabase.from("profiles").select("ui_settings").eq("user_id", user.id).single();
                        const currentCloud = (profile?.ui_settings as any) || {};
                        const local = { ...get() };
                        delete (local as any).setCardSize;
                        delete (local as any).toggleField;
                        delete (local as any).addCustomPhase;
                        delete (local as any).removeCustomPhase;
                        delete (local as any).loadFromCloud;

                        await supabase.from("profiles").update({ 
                            ui_settings: { ...currentCloud, client_settings: local } 
                        }).eq("user_id", user.id);
                    }
                }
            },

            removeCustomPhase: async (value) => {
                const current = get().customPhases || [];
                set({ customPhases: current.filter(p => p.value !== value) });
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase.from("profiles").select("ui_settings").eq("user_id", user.id).single();
                    const currentCloud = (profile?.ui_settings as any) || {};
                    const local = { ...get() };
                    delete (local as any).setCardSize;
                    delete (local as any).toggleField;
                    delete (local as any).addCustomPhase;
                    delete (local as any).removeCustomPhase;
                    delete (local as any).loadFromCloud;

                    await supabase.from("profiles").update({ 
                        ui_settings: { ...currentCloud, client_settings: local } 
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
                    const settings = (data.ui_settings as any).client_settings;
                    if (settings) set(settings);
                }
            }
        }),
        {
            name: "crm-board-settings",
        }
    )
);
