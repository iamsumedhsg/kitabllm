"use client";

import { useState, useCallback, useEffect } from "react";
import { useChatStore } from "@/store/chat-store";
import type { Message, Citation } from "@/types";

interface UseChatOptions {
  notebookId: string;
}

export function useChat({ notebookId }: UseChatOptions) {
  const [error, setError] = useState<string | null>(null);
  const {
    messages,
    activeConversationId,
    isStreaming,
    streamContent,
    pipelineState,
    setMessages,
    setActiveConversation,
    addMessage,
    setStreaming,
    setStreamContent,
    appendStreamContent,
    setPipelineState,
  } = useChatStore();

  // Load the most recent conversation for this notebook on mount
  useEffect(() => {
    let cancelled = false;

    async function loadConversation() {
      try {
        // Fetch conversations for this notebook
        const res = await fetch(`/api/chat/history?notebookId=${notebookId}`);
        if (!res.ok) return;
        const data = await res.json();

        if (cancelled) return;

        if (data.conversation && data.messages) {
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
          // No existing conversation
          setActiveConversation(null);
          setMessages([]);
        }
      } catch {
        // Silently fail — user can still start a new conversation
      }
    }

    loadConversation();
    return () => { cancelled = true; };
  }, [notebookId, setActiveConversation, setMessages]);

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
            conversationId: activeConversationId,
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
                } else if (parsed.type === "conversationId") {
                  // Server created a new conversation — track it
                  setActiveConversation(parsed.conversationId);
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
