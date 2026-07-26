"use client";

import { useEffect, useRef, useMemo } from "react";
import { useChat } from "@/hooks/use-chat";
import { useChatStore } from "@/store/chat-store";
import { ChatInput } from "./chat-input";
import { ChatMessage } from "./chat-message";
import { FollowUpSuggestions } from "./follow-up-suggestions";
import { Sparkles } from "lucide-react";

interface ChatWindowProps {
  notebookId: string;
  notebookTitle: string;
}

export function ChatWindow({ notebookId, notebookTitle }: ChatWindowProps) {
  const { messages, isStreaming, streamContent, pipelineState, sendMessage, stopGeneration } =
    useChat({ notebookId });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamContent]);

  // Get last user message and assistant response for follow-up suggestions
  const lastExchange = useMemo(() => {
    if (messages.length < 2) return null;
    const lastAssistant = [...messages].reverse().find((m) => m.role === "ASSISTANT");
    const lastUser = [...messages].reverse().find((m) => m.role === "USER");
    if (!lastAssistant || !lastUser) return null;
    return { userMessage: lastUser.content, assistantResponse: lastAssistant.content };
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 && !isStreaming ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">{notebookTitle}</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Ask questions about your uploaded sources. I&apos;ll provide answers
              with citations from your documents.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2 max-w-sm">
              {[
                "Summarize the main points",
                "What are the key concepts?",
                "Compare the different sources",
                "Explain the methodology",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => sendMessage(suggestion)}
                  className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors text-left"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6 max-w-3xl mx-auto">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}

            {/* Streaming indicator */}
            {isStreaming && streamContent && (
              <ChatMessage
                message={{
                  id: "streaming",
                  conversationId: "",
                  role: "ASSISTANT",
                  content: streamContent,
                  createdAt: new Date(),
                }}
                isStreaming
              />
            )}

            {/* Pipeline state indicator */}
            {isStreaming && pipelineState.stage !== "STREAMING" && pipelineState.stage !== "COMPLETE" && (
              <div className="flex items-center gap-3 py-3">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm text-muted-foreground">
                  {pipelineState.stage === "DECOMPOSING" && "Analyzing your query..."}
                  {pipelineState.stage === "RETRIEVING" && "Searching sources..."}
                  {pipelineState.stage === "RANKING" && "Ranking results..."}
                  {pipelineState.stage === "GENERATING" && "Generating response..."}
                  {pipelineState.stage === "REFINING" && "Refining answer..."}
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Follow-up suggestions */}
      {lastExchange && !isStreaming && (
        <div className="px-6 pb-2">
          <FollowUpSuggestions
            notebookId={notebookId}
            lastMessage={lastExchange.userMessage}
            lastResponse={lastExchange.assistantResponse}
            onSelect={sendMessage}
            show={!isStreaming && messages.length >= 2}
          />
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border p-4">
        <ChatInput
          onSend={sendMessage}
          onStop={stopGeneration}
          isStreaming={isStreaming}
        />
      </div>
    </div>
  );
}
