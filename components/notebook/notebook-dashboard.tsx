"use client";

import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Layers,
  MessageSquare,
  HardDrive,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface NotebookStats {
  totalSources: number;
  readySources: number;
  indexingSources: number;
  failedSources: number;
  totalChunks: number;
  totalQuestions: number;
  totalConversations: number;
  storageUsed: number;
  lastUpdated: string;
}

interface NotebookDashboardProps {
  notebookId: string;
}

export function NotebookDashboard({ notebookId }: NotebookDashboardProps) {
  const { data: stats, isLoading } = useQuery<NotebookStats>({
    queryKey: ["notebook-stats", notebookId],
    queryFn: async () => {
      const res = await fetch(`/api/notebooks/${notebookId}/stats`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    refetchInterval: 10000,
  });

  const formatStorage = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(1)} GB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      label: "Sources",
      value: stats.totalSources,
      icon: FileText,
      detail: `${stats.readySources} ready`,
      color: "text-blue-500",
    },
    {
      label: "Chunks",
      value: stats.totalChunks,
      icon: Layers,
      detail: "indexed",
      color: "text-purple-500",
    },
    {
      label: "Questions",
      value: stats.totalQuestions,
      icon: MessageSquare,
      detail: `${stats.totalConversations} conversations`,
      color: "text-green-500",
    },
    {
      label: "Storage",
      value: formatStorage(stats.storageUsed),
      icon: HardDrive,
      detail: "used",
      color: "text-orange-500",
    },
  ];

  return (
    <div className="p-4 border-b border-border">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-lg border border-border bg-card p-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">
                  {stat.label}
                </span>
              </div>
              <p className="text-lg font-semibold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.detail}</p>
            </div>
          );
        })}
      </div>

      {/* Status indicators */}
      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        {stats.indexingSources > 0 && (
          <span className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin text-yellow-500" />
            {stats.indexingSources} indexing
          </span>
        )}
        {stats.failedSources > 0 && (
          <span className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3 text-red-500" />
            {stats.failedSources} failed
          </span>
        )}
        {stats.readySources > 0 && stats.indexingSources === 0 && (
          <span className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-green-500" />
            All sources ready
          </span>
        )}
        <span className="flex items-center gap-1 ml-auto">
          <Clock className="h-3 w-3" />
          Updated {formatDate(stats.lastUpdated)}
        </span>
      </div>
    </div>
  );
}
