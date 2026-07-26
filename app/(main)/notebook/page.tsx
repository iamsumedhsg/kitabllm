"use client";

import { useNotebooks } from "@/hooks/use-notebooks";
import { NotebookList } from "@/components/notebook/notebook-list";
import { CreateNotebookDialog } from "@/components/notebook/create-notebook-dialog";
import { Plus } from "lucide-react";

export default function NotebooksPage() {
  const { data: notebooks, isLoading } = useNotebooks();

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Notebooks</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage your AI research notebooks
          </p>
        </div>
        <CreateNotebookDialog>
          <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            New Notebook
          </button>
        </CreateNotebookDialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-40 rounded-xl bg-muted animate-pulse"
            />
          ))}
        </div>
      ) : (
        <NotebookList notebooks={notebooks || []} />
      )}
    </div>
  );
}
