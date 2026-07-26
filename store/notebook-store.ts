import { create } from "zustand";
import type { Notebook } from "@/types";

interface NotebookState {
  notebooks: Notebook[];
  activeNotebookId: string | null;
  isLoading: boolean;
  setNotebooks: (notebooks: Notebook[]) => void;
  setActiveNotebook: (id: string | null) => void;
  addNotebook: (notebook: Notebook) => void;
  updateNotebook: (id: string, data: Partial<Notebook>) => void;
  removeNotebook: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useNotebookStore = create<NotebookState>((set) => ({
  notebooks: [],
  activeNotebookId: null,
  isLoading: false,
  setNotebooks: (notebooks) => set({ notebooks }),
  setActiveNotebook: (id) => set({ activeNotebookId: id }),
  addNotebook: (notebook) =>
    set((state) => ({ notebooks: [notebook, ...state.notebooks] })),
  updateNotebook: (id, data) =>
    set((state) => ({
      notebooks: state.notebooks.map((n) =>
        n.id === id ? { ...n, ...data } : n
      ),
    })),
  removeNotebook: (id) =>
    set((state) => ({
      notebooks: state.notebooks.filter((n) => n.id !== id),
      activeNotebookId:
        state.activeNotebookId === id ? null : state.activeNotebookId,
    })),
  setLoading: (loading) => set({ isLoading: loading }),
}));
