"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useNotebooks, useDeleteNotebook } from "@/hooks/use-notebooks";
import { CreateNotebookDialog } from "@/components/notebook/create-notebook-dialog";
import {
  BookOpen,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: notebooks } = useNotebooks();
  const deleteNotebook = useDeleteNotebook();

  const handleDelete = (e: React.MouseEvent, notebookId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this notebook? All sources and conversations will be removed.")) return;
    deleteNotebook.mutate(notebookId, {
      onSuccess: () => {
        if (pathname === `/notebook/${notebookId}`) {
          router.push("/notebook");
        }
      },
    });
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 60 : 260 }}
      className="relative flex h-full flex-col clay-sidebar"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <Image src="/book.svg" alt="KitabLLM" width={22} height={22} className="logo-themed" />
              <span className="text-lg font-semibold text-foreground">KitabLLM</span>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-lg p-1.5 hover:bg-accent transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 clay-input px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search notebooks..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
      )}

      {/* New Notebook Button */}
      <div className="px-3 pb-2">
        <CreateNotebookDialog>
          <button
            className={cn(
              "flex w-full items-center gap-2 rounded-xl border border-dashed border-primary/20 px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-accent hover:text-foreground hover:border-primary/30",
              collapsed && "justify-center px-0"
            )}
          >
            <Plus className="h-4 w-4" />
            {!collapsed && <span>New Notebook</span>}
          </button>
        </CreateNotebookDialog>
      </div>

      {/* Notebook List */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <div className="space-y-1">
          {notebooks?.map((notebook) => {
            const isActive = pathname === `/notebook/${notebook.id}`;
            return (
              <Link
                key={notebook.id}
                href={`/notebook/${notebook.id}`}
                className={cn(
                  "group flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-all",
                  isActive
                    ? "bg-primary/10 text-foreground font-medium shadow-sm border border-primary/15"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  collapsed && "justify-center px-0"
                )}
              >
                <BookOpen className="h-4 w-4 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="truncate flex-1">{notebook.title}</span>
                    <button
                      onClick={(e) => handleDelete(e, notebook.id)}
                      className="opacity-0 group-hover:opacity-100 rounded-lg p-0.5 hover:bg-destructive/10 hover:text-destructive transition-all"
                      title="Delete notebook"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </motion.aside>
  );
}
