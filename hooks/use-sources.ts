"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Source } from "@/types";

export function useSources(notebookId: string | null) {
  return useQuery<Source[]>({
    queryKey: ["sources", notebookId],
    queryFn: async () => {
      const res = await fetch(`/api/sources?notebookId=${notebookId}`);
      if (!res.ok) throw new Error("Failed to fetch sources");
      return res.json();
    },
    enabled: !!notebookId,
    refetchInterval: 5000, // Poll for status updates during indexing
  });
}

export function useUploadSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/sources/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to upload source");
      }
      return res.json() as Promise<Source>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["sources", data.notebookId],
      });
    },
  });
}

export function useDeleteSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, notebookId }: { id: string; notebookId: string }) => {
      const res = await fetch(`/api/sources/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete source");
      return { id, notebookId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["sources", data.notebookId],
      });
    },
  });
}

export function useReindexSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, notebookId }: { id: string; notebookId: string }) => {
      const res = await fetch(`/api/sources/${id}/reindex`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to reindex source");
      return { id, notebookId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["sources", data.notebookId],
      });
    },
  });
}
