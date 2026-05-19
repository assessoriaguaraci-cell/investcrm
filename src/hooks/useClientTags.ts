import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type ClientTag = Tables<"client_tags">;

export const TAG_COLORS = [
  { value: "blue", label: "Azul", bg: "bg-blue-50 text-blue-700 border-blue-200/50 hover:bg-blue-100" },
  { value: "red", label: "Vermelho", bg: "bg-red-50 text-red-700 border-red-200/50 hover:bg-red-100" },
  { value: "green", label: "Verde", bg: "bg-green-50 text-green-700 border-green-200/50 hover:bg-green-100" },
  { value: "yellow", label: "Amarelo", bg: "bg-yellow-50 text-yellow-700 border-yellow-200/50 hover:bg-yellow-100" },
  { value: "purple", label: "Roxo", bg: "bg-purple-50 text-purple-700 border-purple-200/50 hover:bg-purple-100" },
  { value: "orange", label: "Laranja", bg: "bg-orange-50 text-orange-700 border-orange-200/50 hover:bg-orange-100" },
  { value: "teal", label: "Verde-água", bg: "bg-teal-50 text-teal-700 border-teal-200/50 hover:bg-teal-100" },
  { value: "pink", label: "Rosa", bg: "bg-pink-50 text-pink-700 border-pink-200/50 hover:bg-pink-100" },
  { value: "indigo", label: "Índigo", bg: "bg-indigo-50 text-indigo-700 border-indigo-200/50 hover:bg-indigo-100" },
  { value: "gray", label: "Cinza", bg: "bg-slate-50 text-slate-700 border-slate-200/50 hover:bg-slate-100" }
];

export function getTagBgColor(colorName?: string) {
  const found = TAG_COLORS.find(c => c.value === colorName);
  return found ? found.bg : "bg-blue-50 text-blue-700 border-blue-200/50";
}

export function useClientTags() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("client-tags-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "client_tags" },
        () => {
          qc.invalidateQueries({ queryKey: ["client-tags"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return useQuery({
    queryKey: ["client-tags"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("client_tags")
          .select("*")
          .order("name", { ascending: true });

        if (error) {
          console.warn("client_tags table might not exist yet:", error);
          return [] as ClientTag[];
        }
        return (data || []) as ClientTag[];
      } catch (err) {
        console.warn("Failed to fetch client tags:", err);
        return [] as ClientTag[];
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

export function useCreateClientTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"client_tags">) => {
      const { data, error } = await supabase
        .from("client_tags")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-tags"] });
    },
  });
}

export function useUpdateClientTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"client_tags"> & { id: string }) => {
      const { data, error } = await supabase
        .from("client_tags")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-tags"] });
    },
  });
}

export function useDeleteClientTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("client_tags")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-tags"] });
    },
  });
}
