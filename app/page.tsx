import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, Sparkles, Zap, Shield } from "lucide-react";
import { SignInButton, SignUpButton } from "@clerk/nextjs";

export default async function LandingPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/notebook");
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">KitabLLM</span>
        </div>
        <div className="flex items-center gap-3">
          <SignInButton>
            <button className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-accent transition-colors">
              Sign In
            </button>
          </SignInButton>
          <SignUpButton>
            <button className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              Get Started
            </button>
          </SignUpButton>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div className="max-w-2xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            AI Research Notebook
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Upload your documents, ask questions, and get grounded answers with
            citations. Your personal AI research assistant powered by advanced
            RAG.
          </p>
          <SignUpButton>
            <button className="inline-flex items-center gap-2 px-6 py-3 text-base font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg transition-all">
              <Sparkles className="h-5 w-5" />
              Start Researching
            </button>
          </SignUpButton>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 max-w-4xl w-full">
          <div className="rounded-xl border border-border p-6 bg-card">
            <Zap className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-1">Multi-Source RAG</h3>
            <p className="text-sm text-muted-foreground">
              Upload PDFs, websites, YouTube videos, and text. Get answers
              grounded in your sources.
            </p>
          </div>
          <div className="rounded-xl border border-border p-6 bg-card">
            <Sparkles className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-1">Smart Citations</h3>
            <p className="text-sm text-muted-foreground">
              Every answer includes clickable citations linking back to the
              exact passage in your sources.
            </p>
          </div>
          <div className="rounded-xl border border-border p-6 bg-card">
            <Shield className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-1">Isolated Workspaces</h3>
            <p className="text-sm text-muted-foreground">
              Each notebook has its own knowledge base. Your data stays
              private and isolated.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
