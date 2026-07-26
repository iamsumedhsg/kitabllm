"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useChatStore } from "@/store/chat-store";
import type { Message, Citation } from "@/types";

interface UseChatOptions {
  notebookId: string;
}

export function useChat({ notebookId }: UseChatOptions) {
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const isStreamingRef = useRef(false);

  const messages = useChatStore((s) => s.messages);
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const streamContent = useChatStore((s) => s.streamContent);
  const pipelineState = useChatStore((s) => s.pipelineState);
  const setMessages = useChatStore((s) => s.setMessages);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const addMessage = useChatStore((s) => s.addMessage);
  const setStreaming = useChatStore((s) => s.setStreaming);
  const setStreamContent = useChatStore((s) => s.setStreamContent);
  const appendStreamContent = useChatStore((s) => s.appendStreamContent);
  const setPipelineState = useChatStore((s) => s.setPipelineState);

  // Keep streaming ref in sync
  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

  // Load the most recent conversation for this notebook on mount ONLY
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    async function loadConversation() {
      try {
        const res = await fetch(`/api/chat/history?notebookId=${notebookId}`);
        if (!res.ok) return;
        const data = await res.json();

        // Don't overwrite if user already started streaming
        if (isStreamingRef.current) return;

        if (data.conversation && data.messages && data.messages.length > 0) {
          setActiveConversation(data.conversation.id);
          setMessages(
            data.messages.map((m: any) => ({
              id: m.id,
              conversationId: m.conversationId,
              role: m.role,
              content: m.content,
              citations: m.citations || [],
              createdAt: new Date(m.createdAt),
            }))
          );
        } else {
          setActiveConversation(null);
          setMessages([]);
        }
      } catch {
        // Silently fail
      }
    }

    loadConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notebookId]);

  const sendMessage = useCallback(
    async (content: string) => {
      setError(null);
      setStreaming(true);
      setStreamContent("");
      setPipelineState({ stage: "DECOMPOSING", progress: 10 });

      // Add user message immediately (optimistic)
      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        conversationId: activeConversationId || "",
        role: "USER",
        content,
        createdAt: new Date(),
      };
      addMessage(userMessage);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notebookId,
            ...(activeConversationId ? { conversationId: activeConversationId } : {}),
            message: content,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(errText || "Failed to send message");
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let fullResponse = "";
        let citations: Citation[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.type === "content") {
                  fullResponse += parsed.content;
                  appendStreamContent(parsed.content);
                } else if (parsed.type === "citations") {
                  citations = parsed.citations;
                } else if (parsed.type === "stage") {
                  setPipelineState({
                    stage: parsed.stage,
                    progress: parsed.progress,
                  });
                } else if (parsed.type === "conversationId") {
                  setActiveConversation(parsed.conversationId);
                }
              } catch {
                // Non-JSON data chunk
                if (data.trim()) {
                  fullResponse += data;
                  appendStreamContent(data);
                }
              }
            }
          }
        }

        // Add the complete assistant message
        const assistantMessage: Message = {
          id: `temp-${Date.now()}-assistant`,
          conversationId: activeConversationId || "",
          role: "ASSISTANT",
          content: fullResponse,
          citations,
          createdAt: new Date(),
        };
        addMessage(assistantMessage);

        setPipelineState({ stage: "COMPLETE", progress: 100 });
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setPipelineState({
          stage: "ERROR",
          progress: 0,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        setStreaming(false);
      }
    },
    [
      notebookId,
      activeConversationId,
      addMessage,
      setActiveConversation,
      setStreaming,
      setStreamContent,
      appendStreamContent,
      setPipelineState,
    ]
  );

  const stopGeneration = useCallback(() => {
    setStreaming(false);
    setPipelineState({ stage: "COMPLETE", progress: 100 });
  }, [setStreaming, setPipelineState]);

  return {
    messages,
    isStreaming,
    streamContent,
    pipelineState,
    error,
    sendMessage,
    stopGeneration,
  };
}
