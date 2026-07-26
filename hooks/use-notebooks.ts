"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Notebook } from "@/types";
import type { CreateNotebookInput, UpdateNotebookInput } from "@/lib/validators/notebook";

export function useNotebooks() {
  return useQuery<Notebook[]>({
    queryKey: ["notebooks"],
    queryFn: async () => {
      const res = await fetch("/api/notebooks");
      if (!res.ok) throw new Error("Failed to fetch notebooks");
      return res.json();
    },
  });
}

export function useNotebook(id: string | null) {
  return useQuery<Notebook>({
    queryKey: ["notebooks", id],
    queryFn: async () => {
      const res = await fetch(`/api/notebooks/${id}`);
      if (!res.ok) throw new Error("Failed to fetch notebook");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateNotebook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateNotebookInput) => {
      const res = await fetch("/api/notebooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create notebook");
      return res.json() as Promise<Notebook>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
    },
  });
}

export function useUpdateNotebook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateNotebookInput;
    }) => {
      const res = await fetch(`/api/notebooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update notebook");
      return res.json() as Promise<Notebook>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      queryClient.invalidateQueries({
        queryKey: ["notebooks", variables.id],
      });
    },
  });
}

export function useDeleteNotebook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notebooks/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete notebook");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
    },
  });
}
