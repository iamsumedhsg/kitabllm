import { create } from "zustand";
import type { Source, Citation } from "@/types";

interface ViewerState {
  isOpen: boolean;
  activeSource: Source | null;
  activeCitation: Citation | null;
  highlightText: string | null;
  highlightChunkId: string | null;
  openViewer: (source: Source, citation?: Citation) => void;
  closeViewer: () => void;
  setHighlightChunk: (chunkId: string | null) => void;
}

export const useViewerStore = create<ViewerState>((set) => ({
  isOpen: false,
  activeSource: null,
  activeCitation: null,
  highlightText: null,
  highlightChunkId: null,
  openViewer: (source, citation) =>
    set({
      isOpen: true,
      activeSource: source,
      activeCitation: citation || null,
      highlightText: citation?.excerpt || null,
      highlightChunkId: citation?.chunkId || null,
    }),
  closeViewer: () =>
    set({
      isOpen: false,
      activeSource: null,
      activeCitation: null,
      highlightText: null,
      highlightChunkId: null,
    }),
  setHighlightChunk: (chunkId) => set({ highlightChunkId: chunkId }),
}));
