# KitabLLM

**AI Research Notebook** — Upload documents, ask questions, get grounded answers with citations.

A production-grade research assistant built with a multi-stage RAG pipeline. Think Google NotebookLM / YouTube Ask, but self-hosted.

![Next.js](https://img.shields.io/badge/Next.js_16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma)
![Clerk](https://img.shields.io/badge/Clerk-6C47FF?logo=clerk&logoColor=white)

---

## What It Does

Upload your research materials — PDFs, YouTube videos, websites, transcripts, text — into isolated notebooks. Ask questions and get structured, cited answers grounded exclusively in your sources. Every claim links back to a specific page or timestamp.

### Key Features

- **Multi-Source RAG** — PDF, YouTube, websites, VTT subtitles, plain text
- **Timestamp-Aware Citations** — YouTube answers cite exact timestamps like `(3:01-3:09)`
- **Isolated Notebooks** — Each notebook has its own vector space. No cross-contamination.
- **Streaming Responses** — Real-time SSE streaming with pipeline stage indicators
- **AI Summary** — Generate executive summaries, flashcards, and quizzes from your sources
- **Follow-Up Suggestions** — AI-generated contextual follow-up questions after each answer
- **Semantic Search** — Search your notebook without chatting
- **Source Viewer** — Click a citation to open the PDF page, YouTube timestamp, or text passage

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Next.js App Router                      │
├─────────┬──────────────┬─────────────────┬───────────────┤
│ Sidebar │ Source Panel │ Chat Interface  │ Source Viewer │
└────┬────┴──────┬───────┴────────┬────────┴───────┬───────┘
     │           │                │                │
     ▼           ▼                ▼                ▼
┌──────────────────────────────────────────────────────────┐
│                    API Routes (Route Handlers)             │
└────┬───────────┬────────────────┬────────────────────────┘
     │           │                │
     ▼           ▼                ▼
┌─────────┐ ┌──────────┐ ┌────────────────────────────────┐
│ Source  │ │Embedding │ │    RAG Query Engine             │
│ Pipeline│ │ Service  │ │                                │
│         │ │          │ │  Query Decomposition           │
│ PDF     │ │ text-emb-│ │  → Step-Back Prompting         │
│ YouTube │ │ 3-small  │ │  → Query Rewrite               │
│ Website │ │          │ │  → HyDE Generation             │
│ VTT     │ │ pgvector │ │  → Multi-Query Retrieval       │
│ Text    │ │          │ │  → RRF Ranking                 │
└─────────┘ └──────────┘ │  → Progressive Response        │
                          └────────────────────────────────┘
     │           │                │
     ▼           ▼                ▼
┌──────────────────────────────────────────────────────────┐
│          Neon PostgreSQL + pgvector                        │
│  Users │ Notebooks │ Sources │ Chunks │ Conversations     │
└──────────────────────────────────────────────────────────┘
```

---

## RAG Pipeline

Not a simple "embed → retrieve → generate" setup. The pipeline implements:

1. **Query Decomposition** — Break complex questions into atomic sub-queries
2. **Step-Back Prompting** — Generate broader context queries
3. **Query Rewrite** — Fix spelling, resolve ambiguity
4. **HyDE** — Generate hypothetical answer documents for better retrieval
5. **Multi-Query Retrieval** — Parallel vector search across all query variants
6. **MMR** — Maximal Marginal Relevance for diversity
7. **RRF Ranking** — Reciprocal Rank Fusion to combine retrieval strategies
8. **Chunk Deduplication & Grouping** — Remove noise, group by source
9. **Progressive Streaming** — Start responding immediately with increasing confidence

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4, Framer Motion |
| State | Zustand, React Query |
| Auth | Clerk |
| Database | Neon PostgreSQL, Prisma 7 |
| Vectors | pgvector (1536-dim) |
| LLM | GPT-4.1 via OpenAI-compatible API |
| Embeddings | text-embedding-3-small |
| Extraction | pdf-parse, youtube-transcript, readability, cheerio |
| Chunking | LangChain RecursiveCharacterTextSplitter |
| Validation | Zod |

---

## Project Structure

```
kitabllm/
├── app/
│   ├── (auth)/sign-in, sign-up      # Clerk auth pages
│   ├── (main)/                       # Authenticated layout
│   │   ├── notebook/[id]/            # Notebook workspace
│   │   └── page.tsx                  # Dashboard
│   └── api/
│       ├── notebooks/                # CRUD
│       ├── sources/                  # Upload, reindex, delete
│       ├── chat/                     # Streaming RAG + suggestions
│       └── search/                   # Semantic search
├── components/
│   ├── chat/                         # ChatWindow, ChatInput, Citations
│   ├── source/                       # SourceList, SourceUploader, SourceCard
│   ├── viewer/                       # PDF, YouTube, Website, Transcript viewers
│   ├── notebook/                     # NotebookCard, Dashboard, Summary
│   └── layout/                       # Sidebar, Header, ThemeToggle
├── lib/
│   ├── ai/
│   │   ├── rag/                      # Full pipeline (decompose, hyde, rank, stream)
│   │   ├── prompts/                  # System prompts
│   │   ├── embeddings.ts            # Embedding generation
│   │   └── llm.ts                   # OpenAI client config
│   ├── processing/                   # PDF, YouTube, Website, VTT, Text extractors
│   ├── vectors/                      # pgvector store & search
│   └── validators/                   # Zod schemas
├── store/                            # Zustand stores
├── hooks/                            # React Query hooks
├── types/                            # Shared TypeScript types
├── prisma/schema.prisma              # Database schema
└── docker-compose.yml                # Local dev with pgvector
```

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (package manager & runtime)
- [Neon](https://neon.tech) PostgreSQL database (free tier works)
- [Clerk](https://clerk.com) account for auth
- OpenAI-compatible API key

### Setup

```bash
# Clone and install
cd kitabllm
bun install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Setup database
bunx prisma migrate dev

# Generate Prisma client
bunx prisma generate

# Run development server
bun run dev
```

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:pass@your-neon-host.neon.tech/kitabllm?sslmode=require"

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# AI
AI_BASE_URL="https://aicredits.in/v1"
AI_API_KEY="your-key"
EMBEDDING_MODEL="text-embedding-3-small"
CHAT_MODEL="gpt-4.1"
```

### Docker (Local Development)

```bash
docker-compose up -d   # Starts pgvector on port 5432
bun run dev
```

---

## How It Works

### Source Processing Pipeline

```
Upload → Extract → Clean → Chunk (with timestamps) → Embed → Store in pgvector
```

| Source Type | Extraction Method |
|------------|------------------|
| PDF | pdf-parse (page-aware chunking) |
| YouTube | youtube-transcript (InnerTube API, timestamp-preserving chunks) |
| Website | @mozilla/readability + cheerio (nav/footer/ads stripped) |
| VTT | Custom parser (timestamp segments) |
| Text | Direct storage |

### Query Flow

```
"What happened with OpenAI and Hugging Face?"
         │
         ▼
┌─ Decompose into sub-queries
├─ Generate step-back query (broader context)
├─ Rewrite query (fix typos/ambiguity)
└─ Generate HyDE document (hypothetical answer)
         │
         ▼ (all queries run in parallel)
┌─ Vector search (rewritten query, MMR)
├─ Vector search (step-back query)
├─ Vector search (HyDE document)
└─ Vector search (sub-queries)
         │
         ▼
   RRF Fusion → Deduplicate → Group by source → Top 5 groups
         │
         ▼
   Stream response with inline timestamp citations
```

---

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/notebooks` | List user notebooks |
| `POST` | `/api/notebooks` | Create notebook |
| `PATCH` | `/api/notebooks/:id` | Rename notebook |
| `DELETE` | `/api/notebooks/:id` | Delete notebook + all data |
| `GET` | `/api/notebooks/:id/stats` | Notebook statistics |
| `POST` | `/api/notebooks/:id/summary` | AI-generated summary |
| `POST` | `/api/sources/upload` | Upload & process source |
| `DELETE` | `/api/sources/:id` | Delete source + vectors |
| `POST` | `/api/sources/:id/reindex` | Re-process source |
| `POST` | `/api/chat` | Streaming RAG response (SSE) |
| `GET` | `/api/chat/history` | Conversation history |
| `POST` | `/api/chat/suggestions` | Follow-up questions |
| `POST` | `/api/search` | Semantic search |

---

## Database Schema

```
User (Clerk-synced)
 └── Notebook
      ├── Source (PDF/YT/Web/VTT/Text)
      │    └── Chunk (content + embedding vector)
      └── Conversation
           └── Message
                └── Citation → Source + Chunk
```

All vectors are 1536-dimensional (text-embedding-3-small). Search is scoped to notebook ID — complete isolation.

---

## Deployment

### Vercel

```bash
vercel deploy
```

Set environment variables in the Vercel dashboard. The app uses Edge-compatible dependencies.

### Docker

```bash
docker build -t kitabllm .
docker run -p 3000:3000 --env-file .env kitabllm
```

---

## License

MIT

---

Built with obsessive attention to RAG quality. Not a demo — a tool you'd actually use for research.
