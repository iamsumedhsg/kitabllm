import { create } from "zustand";
import type { Source } from "@/types";

interface SourceState {
  sources: Source[];
  isUploading: boolean;
  uploadProgress: Record<string, number>;
  setSources: (sources: Source[]) => void;
  addSource: (source: Source) => void;
  updateSource: (id: string, data: Partial<Source>) => void;
  removeSource: (id: string) => void;
  setUploading: (uploading: boolean) => void;
  setUploadProgress: (id: string, progress: number) => void;
  clearUploadProgress: (id: string) => void;
}

export const useSourceStore = create<SourceState>((set) => ({
  sources: [],
  isUploading: false,
  uploadProgress: {},
  setSources: (sources) => set({ sources }),
  addSource: (source) =>
    set((state) => ({ sources: [...state.sources, source] })),
  updateSource: (id, data) =>
    set((state) => ({
      sources: state.sources.map((s) =>
        s.id === id ? { ...s, ...data } : s
      ),
    })),
  removeSource: (id) =>
    set((state) => ({
      sources: state.sources.filter((s) => s.id !== id),
    })),
  setUploading: (uploading) => set({ isUploading: uploading }),
  setUploadProgress: (id, progress) =>
    set((state) => ({
      uploadProgress: { ...state.uploadProgress, [id]: progress },
    })),
  clearUploadProgress: (id) =>
    set((state) => {
      const { [id]: _, ...rest } = state.uploadProgress;
      return { uploadProgress: rest };
    }),
}));
