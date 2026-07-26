"use client";

import { useState, useCallback } from "react";
import { useChatStore } from "@/store/chat-store";
import type { Message, Citation } from "@/types";

interface UseChatOptions {
  notebookId: string;
  conversationId?: string;
}

export function useChat({ notebookId, conversationId }: UseChatOptions) {
  const [error, setError] = useState<string | null>(null);
  const {
    messages,
    isStreaming,
    streamContent,
    pipelineState,
    addMessage,
    setStreaming,
    setStreamContent,
    appendStreamContent,
    setPipelineState,
  } = useChatStore();

  const sendMessage = useCallback(
    async (content: string) => {
      setError(null);
      setStreaming(true);
      setStreamContent("");
      setPipelineState({ stage: "DECOMPOSING", progress: 10 });

      // Add user message immediately (optimistic)
      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        conversationId: conversationId || "",
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
            conversationId,
            message: content,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to send message");
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let fullResponse = "";
        let citations: Citation[] = [];

        setPipelineState({ stage: "STREAMING", progress: 60 });

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
                }
              } catch {
                // Plain text chunk
                fullResponse += data;
                appendStreamContent(data);
              }
            }
          }
        }

        // Add the complete assistant message
        const assistantMessage: Message = {
          id: `temp-${Date.now()}-assistant`,
          conversationId: conversationId || "",
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
      conversationId,
      addMessage,
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
