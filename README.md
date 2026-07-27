# KitabLLM


<img width="1919" height="992" alt="Screenshot 2026-07-27 064942" src="https://github.com/user-attachments/assets/598971fd-adb8-4475-83b6-5ecbb10f5e26" />


<img width="1919" height="988" alt="Screenshot 2026-07-27 065204" src="https://github.com/user-attachments/assets/db41bc11-5eba-4d4e-aafe-792dbdcce727" />

---

**AI Research Notebook** — Upload documents, ask questions, get grounded answers with citations.

A production-grade research assistant built with a multi-stage RAG pipeline. Think Google NotebookLM, but self-hosted.

---

## What It Does

Upload your research materials — PDFs, websites, VTT transcripts, plain text — into isolated notebooks. Ask questions and get structured answers grounded exclusively in your sources. Every claim links back to a specific page or passage.

### Key Features

- **Multi-Source RAG** — PDF, websites, VTT subtitles, plain text
- **Page-Aware Queries** — Ask "what's on page 35" and get the actual content
- **Isolated Notebooks** — Each notebook has its own vector space. No cross-contamination.
- **Streaming Responses** — Real-time SSE streaming with pipeline stage indicators
- **Markdown Rendering** — Responses rendered with proper formatting (headers, lists, code blocks, tables)
- **Copy Button** — One-click copy on any AI response
- **AI Summary** — Generate executive summaries, flashcards, and quizzes from your sources
- **Follow-Up Suggestions** — 3 contextual follow-up questions after each answer
- **Semantic Search** — Search your notebook without chatting
- **Claymorphism UI** — Soft frosted glass design with warm beige/lavender palette
- **Dark/Light Mode** — Horizontal sliding toggle with clay-styled switch

---

<img width="1919" height="990" alt="Screenshot 2026-07-27 065347" src="https://github.com/user-attachments/assets/01a1440e-b013-43b2-8222-b6242868862e" />


---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Next.js 16 App Router                   │
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
│         │ │          │ │  Page Query Detection          │
│ PDF     │ │ text-emb-│ │  → Query Decomposition         │
│ Website │ │ 3-small  │ │  → Step-Back Prompting         │
│ VTT     │ │          │ │  → Query Rewrite               │
│ Text    │ │ pgvector │ │  → HyDE Generation             │
│         │ │          │ │  → Multi-Query Retrieval       │
└─────────┘ └──────────┘ │  → RRF Ranking                 │
                          │  → Progressive Response        │
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

1. **Page Query Detection** — Detects "page X" queries and short-circuits to direct DB lookup
2. **Query Decomposition** — Break complex questions into atomic sub-queries
3. **Step-Back Prompting** — Generate broader context queries
4. **Query Rewrite** — Fix spelling, resolve ambiguity
5. **HyDE** — Generate hypothetical answer documents for better retrieval
6. **Multi-Query Retrieval** — Parallel vector search (fault-tolerant via `Promise.allSettled`)
7. **MMR** — Maximal Marginal Relevance for diversity
8. **RRF Ranking** — Reciprocal Rank Fusion to combine retrieval strategies
9. **Chunk Deduplication & Grouping** — Remove noise, group by source
10. **Progressive Streaming** — Start responding immediately

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS 4, Framer Motion |
| UI Design | Claymorphism (frosted glass, soft shadows) |
| State | Zustand, React Query |
| Auth | Clerk |
| Database | Neon PostgreSQL, Prisma 7 |
| Vectors | pgvector (1536-dim) |
| LLM | GPT-4.1 via OpenAI-compatible API |
| Embeddings | text-embedding-3-small |
| Extraction | pdf-parse, readability, cheerio |
| Chunking | LangChain RecursiveCharacterTextSplitter |
| Markdown | react-markdown, remark-gfm |
| Validation | Zod |

---

## Project Structure

```
kitabllm/
├── app/
│   ├── (auth)/sign-in, sign-up
│   ├── (main)/
│   │   ├── notebook/[id]/            # Notebook workspace
│   │   └── page.tsx                  # Dashboard
│   └── api/
│       ├── notebooks/                # CRUD + stats + summary
│       ├── sources/                  # Upload, reindex, delete, chunks
│       ├── chat/                     # Streaming RAG + suggestions
│       ├── youtube/                  # Transcript pre-fetch
│       └── search/                   # Semantic search
├── components/
│   ├── chat/                         # ChatWindow, ChatInput, Markdown, Citations
│   ├── source/                       # SourceList, SourceUploader, SourceCard
│   ├── viewer/                       # PDF, YouTube, Website, Transcript viewers
│   ├── notebook/                     # NotebookCard, Dashboard, Summary
│   ├── landing/                      # Landing page (claymorphism, orbiting circles)
│   ├── search/                       # SearchBar, SemanticSearch
│   └── layout/                       # Sidebar, Header, ThemeToggle
├── lib/
│   ├── ai/
│   │   ├── rag/                      # Full pipeline (decompose, hyde, rank, stream)
│   │   ├── prompts/                  # System prompts
│   │   ├── embeddings.ts
│   │   └── llm.ts
│   ├── processing/                   # PDF, YouTube, Website, VTT, Text extractors
│   ├── vectors/                      # pgvector store & search + page search
│   └── validators/                   # Zod schemas
├── store/                            # Zustand (chat, notebook, source, viewer)
├── hooks/                            # React Query hooks
├── types/                            # Shared TypeScript types
├── scripts/                          # Debug & maintenance scripts
├── prisma/schema.prisma
├── public/
│   ├── book.svg                      # Logo (theme-adaptive)
│   └── fabicon.png                   # Site favicon
└── docker-compose.yml
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
cd kitabllm
bun install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Setup database
bunx prisma migrate dev

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

## Source Processing

```
Upload → Extract → Clean → Chunk → Embed → Store in pgvector
```

| Source Type | Extraction Method |
|------------|------------------|
| PDF | pdf-parse (page-aware chunking with page numbers) |
| Website | @mozilla/readability + cheerio (nav/footer/ads stripped) |
| VTT | Custom parser (timestamp segments, file or text input) |
| Text | Direct storage |
| YouTube | Coming soon (blocked by YouTube's data center IP restrictions) |

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
| `GET` | `/api/sources/:id/chunks` | Get chunks for viewer |
| `POST` | `/api/chat` | Streaming RAG response (SSE) |
| `GET` | `/api/chat/history` | Conversation history |
| `POST` | `/api/chat/suggestions` | Follow-up questions |
| `POST` | `/api/search` | Semantic search |

---

## Design

The app uses a **claymorphism** design language:

- Warm beige background (`#f5f0eb`)
- Frosted glass cards (`backdrop-filter: blur`, translucent borders)
- Soft multi-layered shadows (inset highlights + diffused outer)
- Lavender/purple accent (`#8b6cc7`)
- Theme-adaptive logo (inverts in dark mode)
- Horizontal sliding theme toggle

---

## Known Limitations

- **YouTube links** require a residential IP to fetch transcripts. YouTube blocks all data center IPs (Render, AWS, GCP). Works locally with `bun run dev`. On cloud hosting, upload VTT files instead.
- **PDF viewer** requires the file to be on the same server. If uploaded on Render and accessed locally, shows excerpt-only mode.

<img width="666" height="478" align="centre" alt="Screenshot 2026-07-27 065256" src="https://github.com/user-attachments/assets/787900c3-03fb-41fb-84d5-d7bf2c7b36e9" />

---

## Deployment

### Render

Build command: `bun install; bun run build`
Start command: `bun run start`

### Docker

```bash
docker build -t kitabllm .
docker run -p 3000:3000 --env-file .env kitabllm
```

---

## License

MIT
