"use client";

import { User, Sparkles } from "lucide-react";
import { CitationChip } from "./citation-chip";
import { cn } from "@/lib/utils";
import type { Message } from "@/types";

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === "USER";

  return (
    <div className={cn("flex gap-3", isUser && "justify-end")}>
      {!isUser && (
        <div className="flex-shrink-0 rounded-lg bg-primary/10 p-2 h-fit">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
      )}

      <div
        className={cn(
          "max-w-[80%] rounded-xl px-4 py-3",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted/50"
        )}
      >
        {/* Message content */}
        <div
          className={cn(
            "prose prose-sm dark:prose-invert max-w-none",
            isUser && "prose-invert"
          )}
        >
          <div className="whitespace-pre-wrap">{message.content}</div>
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5" />
          )}
        </div>

        {/* Citations as clickable evidence chips */}
        {message.citations && message.citations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/30">
            <p className="text-[10px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">
              Evidence
            </p>
            <div className="flex flex-wrap gap-1.5">
              {message.citations.map((citation, i) => (
                <CitationChip key={citation.id} citation={citation} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 rounded-lg bg-primary p-2 h-fit">
          <User className="h-4 w-4 text-primary-foreground" />
        </div>
      )}
    </div>
  );
}
