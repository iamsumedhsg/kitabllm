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
  const abortControllerRef = useRef<AbortController | null>(null);

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

  // Load the most recent conversation on mount ONLY
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    async function loadConversation() {
      try {
        const res = await fetch(`/api/chat/history?notebookId=${notebookId}`);
        if (!res.ok) return;
        const data = await res.json();

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
      setPipelineState({ stage: "DECOMPOSING", progress: 0 });

      // Create abort controller for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Track conversation ID locally (may be updated mid-stream)
      let currentConvId = useChatStore.getState().activeConversationId;

      // Add user message immediately (optimistic)
      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        conversationId: currentConvId || "",
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
            ...(currentConvId ? { conversationId: currentConvId } : {}),
            message: content,
          }),
          signal: abortController.signal,
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
        let buffer = ""; // Buffer for partial SSE lines

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE events (delimited by \n\n)
          const events = buffer.split("\n\n");
          buffer = events.pop() || ""; // Keep incomplete last event in buffer

          for (const event of events) {
            const lines = event.split("\n");
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
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
                  currentConvId = parsed.conversationId;
                  setActiveConversation(parsed.conversationId);
                } else if (parsed.type === "error") {
                  throw new Error(parsed.message || "An error occurred");
                }
              } catch (parseErr) {
                // If it's a thrown error from above, re-throw
                if (parseErr instanceof Error && parseErr.message !== "An error occurred") {
                  if (data.startsWith("{")) {
                    // It was a JSON parse error on valid-looking data, skip
                  } else {
                    throw parseErr;
                  }
                }
              }
            }
          }
        }

        // Clear stream content and add final message
        setStreamContent("");
        const assistantMessage: Message = {
          id: `temp-${Date.now()}-assistant`,
          conversationId: currentConvId || "",
          role: "ASSISTANT",
          content: fullResponse,
          citations,
          createdAt: new Date(),
        };
        addMessage(assistantMessage);

        setPipelineState({ stage: "COMPLETE", progress: 100 });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // User cancelled — no error to show
          setPipelineState({ stage: "IDLE", progress: 0 });
        } else {
          setError(err instanceof Error ? err.message : "An error occurred");
          setPipelineState({ stage: "ERROR", progress: 0 });
        }
      } finally {
        setStreaming(false);
        setStreamContent("");
        abortControllerRef.current = null;
      }
    },
    [
      notebookId,
      addMessage,
      setActiveConversation,
      setStreaming,
      setStreamContent,
      appendStreamContent,
      setPipelineState,
    ]
  );

  const stopGeneration = useCallback(() => {
    // Actually abort the fetch
    abortControllerRef.current?.abort();
    setStreaming(false);
    setStreamContent("");
    setPipelineState({ stage: "IDLE", progress: 0 });
  }, [setStreaming, setStreamContent, setPipelineState]);

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
