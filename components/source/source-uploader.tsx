"use client";

import { useState, useRef } from "react";
import { useUploadSource } from "@/hooks/use-sources";
import {
  X,
  FileText,
  Globe,
  Video,
  AlignLeft,
  Subtitles,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SourceUploaderProps {
  notebookId: string;
  onClose: () => void;
}

type UploadTab = "PDF" | "YOUTUBE" | "WEBSITE" | "TEXT" | "VTT";

export function SourceUploader({ notebookId, onClose }: SourceUploaderProps) {
  const [activeTab, setActiveTab] = useState<UploadTab>("PDF");
  const [url, setUrl] = useState("");
  const [textContent, setTextContent] = useState("");
  const [filename, setFilename] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadSource = useUploadSource();

  const tabs = [
    { id: "PDF" as const, label: "PDF", icon: FileText },
    { id: "YOUTUBE" as const, label: "YT Link", icon: Video },
    { id: "WEBSITE" as const, label: "Web Link", icon: Globe },
    { id: "TEXT" as const, label: "Text", icon: AlignLeft },
    { id: "VTT" as const, label: "VTT", icon: Subtitles },
  ];

  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("notebookId", notebookId);
    formData.append("type", activeTab);
    formData.append("filename", file.name);

    await uploadSource.mutateAsync(formData);
    onClose();
  };

  const handleUrlSubmit = async () => {
    if (!url.trim()) return;

    const formData = new FormData();
    formData.append("notebookId", notebookId);
    formData.append("type", activeTab);
    formData.append("url", url.trim());

    let hostName = "source";
    try { hostName = new URL(url.trim()).hostname; } catch { /* keep default */ }
    formData.append("filename", filename.trim() || hostName);

    try {
      await uploadSource.mutateAsync(formData);
      onClose();
    } catch {
      // Error shown via uploadSource.error
    }
  };

  const handleTextSubmit = async () => {
    if (!textContent.trim()) return;

    const formData = new FormData();
    formData.append("notebookId", notebookId);
    formData.append("type", activeTab);
    formData.append("content", textContent.trim());
    formData.append("filename", filename.trim() || "Untitled");

    try {
      await uploadSource.mutateAsync(formData);
      onClose();
    } catch {
      // Error shown via uploadSource.error
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Add Source</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-5 gap-2 mb-5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs transition-all",
                  activeTab === tab.id
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:border-ring/30 hover:bg-accent/50"
                )}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content based on tab */}
        {(activeTab === "PDF" || activeTab === "VTT") && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-ring/50"
            )}
          >
            <Upload className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm font-medium mb-1">
              Drop your {activeTab} file here
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              or click to browse
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Browse Files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={activeTab === "PDF" ? ".pdf" : ".vtt"}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
          </div>
        )}

        {(activeTab === "YOUTUBE" || activeTab === "WEBSITE") && (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">
                {activeTab === "YOUTUBE" ? "YouTube URL" : "Website URL"}
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={
                  activeTab === "YOUTUBE"
                    ? "https://youtube.com/watch?v=..."
                    : "https://example.com/article"
                }
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                Name (optional)
              </label>
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="Custom name for this source"
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
              />
            </div>
            <button
              onClick={handleUrlSubmit}
              disabled={!url.trim() || uploadSource.isPending}
              className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {uploadSource.isPending ? "Adding..." : "Add Source"}
            </button>
          </div>
        )}

        {activeTab === "TEXT" && (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Name</label>
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="Document name"
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Content</label>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Paste your text content here..."
                rows={8}
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none resize-none focus:border-ring focus:ring-1 focus:ring-ring"
              />
            </div>
            <button
              onClick={handleTextSubmit}
              disabled={!textContent.trim() || uploadSource.isPending}
              className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {uploadSource.isPending ? "Adding..." : "Add Source"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
