"use client";

import { useState } from "react";
import { User, Sparkles, Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CitationChip } from "./citation-chip";
import { cn } from "@/lib/utils";
import type { Message } from "@/types";

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="opacity-0 group-hover:opacity-100 transition-opacity rounded-md p-1 hover:bg-accent"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
      )}
    </button>
  );
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === "USER";

  return (
    <div className={cn("group flex gap-3", isUser && "justify-end")}>
      {!isUser && (
        <div className="flex-shrink-0 rounded-lg bg-primary/10 p-2 h-fit">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
      )}

      <div
        className={cn(
          "max-w-[80%] rounded-xl px-4 py-3 relative",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted/50"
        )}
      >
        {/* Copy button (top right, visible on hover) */}
        {!isUser && !isStreaming && message.content && (
          <div className="absolute top-2 right-2">
            <CopyButton text={message.content} />
          </div>
        )}

        {/* Message content */}
        {isUser ? (
          <p className="text-sm">{message.content}</p>
        ) : (
          <div className={cn(
            "prose prose-sm dark:prose-invert max-w-none",
            "prose-headings:text-foreground prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2",
            "prose-p:text-foreground/90 prose-p:leading-relaxed prose-p:my-1.5",
            "prose-strong:text-foreground prose-strong:font-semibold",
            "prose-ul:my-2 prose-li:my-0.5",
            "prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono",
            "prose-pre:bg-foreground/5 prose-pre:rounded-lg prose-pre:p-3 prose-pre:my-3",
          )}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
            {isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5" />
            )}
          </div>
        )}

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
