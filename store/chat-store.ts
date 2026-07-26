import { create } from "zustand";
import type { Message, Conversation, PipelineState } from "@/types";

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Message[];
  isStreaming: boolean;
  streamContent: string;
  pipelineState: PipelineState;
  setConversations: (conversations: Conversation[]) => void;
  setActiveConversation: (id: string | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, content: string) => void;
  setStreaming: (streaming: boolean) => void;
  setStreamContent: (content: string) => void;
  appendStreamContent: (chunk: string) => void;
  setPipelineState: (state: Partial<PipelineState>) => void;
  reset: () => void;
}

const initialPipelineState: PipelineState = {
  stage: "IDLE",
  progress: 0,
};

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  isStreaming: false,
  streamContent: "",
  pipelineState: initialPipelineState,
  setConversations: (conversations) => set({ conversations }),
  setActiveConversation: (id) => set({ activeConversationId: id }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  updateMessage: (id, content) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, content } : m
      ),
    })),
  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setStreamContent: (content) => set({ streamContent: content }),
  appendStreamContent: (chunk) =>
    set((state) => ({ streamContent: state.streamContent + chunk })),
  setPipelineState: (pState) =>
    set((state) => ({
      pipelineState: { ...state.pipelineState, ...pState },
    })),
  reset: () =>
    set({
      messages: [],
      isStreaming: false,
      streamContent: "",
      pipelineState: initialPipelineState,
    }),
}));
