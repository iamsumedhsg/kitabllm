# Technical Requirements Document (TRD)
## KitabLLM — AI Research Notebook

| Field | Value |
|---|---|
| **Project** | KitabLLM |
| **Version** | 0.1.0 |
| **Live URL** | https://kitabllm.issg.me |
| **Document Date** | 2026-08-01 |
| **Status** | Active Development |

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Stakeholders & Users](#2-stakeholders--users)
3. [Functional Requirements](#3-functional-requirements)
4. [Non-Functional Requirements](#4-non-functional-requirements)
5. [System Architecture](#5-system-architecture)
6. [Tech Stack](#6-tech-stack)
7. [Data Model](#7-data-model)
8. [API Contract](#8-api-contract)
9. [RAG Pipeline Specification](#9-rag-pipeline-specification)
10. [Source Processing Pipeline](#10-source-processing-pipeline)
11. [State Machines](#11-state-machines)
12. [Security Requirements](#12-security-requirements)
13. [Environment Configuration](#13-environment-configuration)
14. [Deployment Requirements](#14-deployment-requirements)
15. [Known Limitations & Constraints](#15-known-limitations--constraints)

---

## 1. System Overview

KitabLLM is a **production-grade, self-hosted AI research assistant** that enables users to upload documents from multiple sources, organize them into isolated notebooks, and ask grounded questions backed by verifiable citations. It is functionally equivalent to Google NotebookLM but fully self-hostable.

### Core Value Proposition

> *"Every answer has a receipt."* — All AI responses are grounded exclusively in user-provided sources, with every claim traceable to a specific page or passage.

### Key Capabilities

| Capability | Description |
|---|---|
| Multi-Source Ingestion | PDF, Website, VTT subtitles, plain text |
| Isolated Notebooks | Per-notebook vector spaces; no cross-contamination |
| Grounded RAG Answers | Responses cite source, page number, or timestamp |
| Streaming Responses | Real-time SSE with pipeline stage indicators |
| Page-Aware Queries | Direct "page X" lookup short-circuits the full pipeline |
| AI Summaries | Executive summaries, flashcards, quiz generation |
| Semantic Search | Notebook-scoped vector search without chat |
| Follow-Up Suggestions | 3 contextual follow-up questions per answer |

---

## 2. Stakeholders & Users

| Role | Description |
|---|---|
| **End User** | Authenticated researcher/student uploading documents and asking questions |
| **Admin/Owner** | Self-hoster managing infrastructure and API keys |

---

## 3. Functional Requirements

### 3.1 Authentication

| ID | Requirement |
|---|---|
| FR-AUTH-01 | System MUST support user registration and login via Clerk |
| FR-AUTH-02 | All main application routes MUST be protected by authentication middleware |
| FR-AUTH-03 | Sign-in and sign-up pages MUST be publicly accessible |
| FR-AUTH-04 | Each user's data (notebooks, sources, conversations) MUST be scoped to their Clerk `userId` |

### 3.2 Notebook Management

| ID | Requirement |
|---|---|
| FR-NB-01 | Users MUST be able to create, rename, and delete notebooks |
| FR-NB-02 | Deleting a notebook MUST cascade-delete all associated sources, chunks, conversations, messages, and citations |
| FR-NB-03 | Each notebook MUST have a unique ID, title, optional description, and timestamps |
| FR-NB-04 | The dashboard MUST display per-notebook statistics: source count, total chunks, total questions asked, storage used |
| FR-NB-05 | Users MUST be able to generate an AI-powered summary for a notebook |

### 3.3 Source Management

| ID | Requirement |
|---|---|
| FR-SRC-01 | System MUST support uploading the following source types: PDF (file), Website (URL), VTT (file or text), plain text |
| FR-SRC-02 | Each source MUST track a processing status: `UPLOADING → INDEXING → READY` (or `FAILED`) |
| FR-SRC-03 | Source processing (extraction, chunking, embedding) MUST run asynchronously; the UI MUST reflect live status |
| FR-SRC-04 | Users MUST be able to delete a source; deletion MUST remove associated chunks and vectors |
| FR-SRC-05 | Users MUST be able to re-index (reprocess) a failed or existing source |
| FR-SRC-06 | The system MUST expose source chunk content for the source viewer |

### 3.4 Chat & RAG

| ID | Requirement |
|---|---|
| FR-CHAT-01 | Chat responses MUST be streamed in real-time via Server-Sent Events (SSE) |
| FR-CHAT-02 | Responses MUST be grounded exclusively in sources belonging to the active notebook |
| FR-CHAT-03 | Every response MUST include structured citations (source name, page number or timestamp, confidence, excerpt) |
| FR-CHAT-04 | The system MUST implement a full multi-stage RAG pipeline (see §9) |
| FR-CHAT-05 | "Page X" queries MUST be detected and short-circuited to a direct database lookup |
| FR-CHAT-06 | Conversation history MUST be persisted per notebook |
| FR-CHAT-07 | The system MUST generate 3 follow-up question suggestions after each response |
| FR-CHAT-08 | Users MUST be able to copy any AI response with a single click |
| FR-CHAT-09 | Responses MUST be rendered as Markdown (headers, lists, code blocks, tables) |

### 3.5 Source Viewer

| ID | Requirement |
|---|---|
| FR-VIEW-01 | The notebook workspace MUST include a resizable right-panel source viewer |
| FR-VIEW-02 | Clicking a citation chip MUST open the corresponding source in the viewer, navigating to the cited location |
| FR-VIEW-03 | PDF viewer MUST support page-level navigation and highlighting |
| FR-VIEW-04 | YouTube viewer MUST support timestamp-level navigation via embedded player |
| FR-VIEW-05 | Website viewer MUST display extracted content with passage highlighting |
| FR-VIEW-06 | VTT transcript viewer MUST support line-level highlighting |
| FR-VIEW-07 | If a PDF file is not accessible from the current origin, the viewer MUST fall back to excerpt-only mode |

### 3.6 Semantic Search

| ID | Requirement |
|---|---|
| FR-SRCH-01 | Users MUST be able to perform semantic search across a notebook's sources without initiating a chat |
| FR-SRCH-02 | Search results MUST be scoped to the active notebook's vector space |

---

## 4. Non-Functional Requirements

### 4.1 Performance

| ID | Requirement |
|---|---|
| NFR-PERF-01 | First token of a streaming response MUST appear within 3 seconds of query submission |
| NFR-PERF-02 | Source upload and initial indexing status MUST reflect within 2 seconds in the UI |
| NFR-PERF-03 | Vector similarity search MUST use an HNSW index for sub-second retrieval |
| NFR-PERF-04 | Multi-query retrieval MUST execute in parallel using `Promise.allSettled` (fault-tolerant) |
| NFR-PERF-05 | The UI MUST implement debounced search and lazy loading to avoid blocking renders |

### 4.2 Reliability & Fault Tolerance

| ID | Requirement |
|---|---|
| NFR-REL-01 | Source processing failures MUST update the source status to `FAILED` and surface a retry option |
| NFR-REL-02 | Individual retrieval failures in multi-query mode MUST not abort the entire pipeline |
| NFR-REL-03 | All API inputs MUST be validated with Zod schemas before processing |
| NFR-REL-04 | The application MUST display toast notifications for all error and success states |

### 4.3 Security

| ID | Requirement |
|---|---|
| NFR-SEC-01 | All API routes MUST verify the authenticated user's Clerk session before processing |
| NFR-SEC-02 | All database queries referencing notebooks or sources MUST include a `userId` filter to prevent IDOR |
| NFR-SEC-03 | API keys (OpenAI, Clerk, DB) MUST be stored exclusively in server-side environment variables |
| NFR-SEC-04 | File uploads MUST be validated for type and size before processing |

### 4.4 Scalability

| ID | Requirement |
|---|---|
| NFR-SCALE-01 | The vector store MUST support notebook-scoped queries using a `notebookId` filter |
| NFR-SCALE-02 | The system MUST support running with a local Docker `pgvector` instance or a managed Neon DB |

### 4.5 Usability & Accessibility

| ID | Requirement |
|---|---|
| NFR-UX-01 | The UI MUST support dark and light themes with a persistent user preference |
| NFR-UX-02 | The theme toggle MUST use a horizontal sliding claymorphism switch |
| NFR-UX-03 | All loading states MUST be visually represented (upload progress, indexing spinner, chat loading) |
| NFR-UX-04 | The application MUST be responsive across desktop screen sizes |

---

## 5. System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                Next.js 16 App Router (Client)             │
│                                                           │
│  ┌──────────┐ ┌─────────────┐ ┌───────────┐ ┌─────────┐ │
│  │ Sidebar  │ │Source Panel │ │Chat Window│ │  Source │ │
│  │Notebooks │ │Upload/List  │ │  + Input  │ │ Viewer  │ │
│  └────┬─────┘ └──────┬──────┘ └─────┬─────┘ └────┬────┘ │
└───────┼──────────────┼──────────────┼─────────────┼──────┘
        │              │              │             │
        ▼              ▼              ▼             ▼
┌──────────────────────────────────────────────────────────┐
│           Next.js Route Handlers (API Layer)              │
│  /api/notebooks  /api/sources  /api/chat  /api/search    │
└───────┬──────────────┬──────────────┬────────────────────┘
        │              │              │
        ▼              ▼              ▼
┌──────────────────────────────────────────────────────────┐
│                     Service Layer                         │
│  ┌──────────────┐  ┌────────────┐  ┌──────────────────┐ │
│  │ Source       │  │ Embedding  │  │  RAG Query       │ │
│  │ Processor    │  │ Service    │  │  Engine          │ │
│  │ (PDF/Web/VTT)│  │ (text-emb- │  │  (10-stage       │ │
│  │              │  │  3-small)  │  │   pipeline)      │ │
│  └──────────────┘  └────────────┘  └──────────────────┘ │
└───────────────────────────┬──────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│                      Data Layer                           │
│  Neon PostgreSQL (Prisma 7)  +  pgvector (1536-dim HNSW) │
│  Users │ Notebooks │ Sources │ Chunks │ Conversations    │
│  Messages │ Citations                                     │
└──────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

| Layer | Responsibility |
|---|---|
| **Client** | Zustand state, React Query data fetching, SSE streaming, Framer Motion UI |
| **API** | Auth guard, Zod validation, orchestration of service calls |
| **Service** | Business logic: extraction, chunking, embedding, RAG pipeline |
| **Data** | Persistent storage (PostgreSQL) and vector storage (pgvector) |

---

## 6. Tech Stack

| Category | Technology | Version |
|---|---|---|
| Framework | Next.js | 16.2.12 |
| Runtime/Package Manager | Bun | latest |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS | ^4 |
| Animation | Framer Motion | ^12 |
| UI Components | shadcn/ui + Lucide React | — |
| Client State | Zustand | ^5 |
| Server State / Data Fetching | TanStack React Query | ^5 |
| Auth | Clerk (`@clerk/nextjs`) | ^7 |
| ORM | Prisma | ^7 |
| Database Adapter | `@prisma/adapter-pg` + `pg` | ^7 / ^8 |
| Database | Neon PostgreSQL | — |
| Vector Extension | pgvector (1536-dim) | — |
| LLM | GPT-4.1 (OpenAI-compatible) | via `ai` SDK ^7 |
| Embeddings | text-embedding-3-small | via `@ai-sdk/openai` |
| PDF Extraction | pdf-parse | ^2 |
| Web Extraction | `@mozilla/readability` + cheerio + jsdom | — |
| Text Splitting | LangChain `RecursiveCharacterTextSplitter` | — |
| Markdown Rendering | react-markdown + remark-gfm | — |
| Schema Validation | Zod | ^4 |
| Containerization | Docker + docker-compose | — |

---

## 7. Data Model

### Entity Relationship Summary

```
User ──< Notebook ──< Source ──< Chunk
                  └──< Conversation ──< Message ──< Citation >── Chunk
                                                              └── Source
```

### Prisma Schema

```prisma
model User {
  id        String     @id @default(cuid())
  clerkId   String     @unique
  email     String     @unique
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  notebooks Notebook[]
}

model Notebook {
  id            String         @id @default(cuid())
  title         String
  description   String?
  userId        String
  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  sources       Source[]
  conversations Conversation[]
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  @@index([userId])
}

model Source {
  id         String       @id @default(cuid())
  notebookId String
  filename   String
  type       SourceType   // PDF | TEXT | WEBSITE | YOUTUBE | VTT
  size       Int
  url        String?
  filePath   String?
  status     SourceStatus @default(UPLOADING)
  metadata   Json?
  chunks     Chunk[]
  citations  Citation[]
  createdAt  DateTime     @default(now())
  updatedAt  DateTime     @updatedAt
  @@index([notebookId])
}

model Chunk {
  id          String                        @id @default(cuid())
  sourceId    String
  content     String
  chunkNumber Int
  pageNumber  Int?
  timestamp   String?
  title       String?
  url         String?
  embedding   Unsupported("vector(1536)")?
  metadata    Json?
  citations   Citation[]
  createdAt   DateTime                      @default(now())
  @@index([sourceId])
}

model Conversation {
  id         String    @id @default(cuid())
  notebookId String
  title      String?
  messages   Message[]
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  @@index([notebookId])
}

model Message {
  id             String       @id @default(cuid())
  conversationId String
  role           MessageRole  // USER | ASSISTANT | SYSTEM
  content        String
  citations      Citation[]
  createdAt      DateTime     @default(now())
  @@index([conversationId])
}

model Citation {
  id         String   @id @default(cuid())
  messageId  String
  sourceId   String
  chunkId    String
  pageNumber Int?
  timestamp  String?
  confidence Float?
  excerpt    String?
  createdAt  DateTime @default(now())
  @@index([messageId])
  @@index([sourceId])
}
```

### Enums

| Enum | Values |
|---|---|
| `SourceType` | `PDF`, `TEXT`, `WEBSITE`, `YOUTUBE`, `VTT` |
| `SourceStatus` | `UPLOADING`, `INDEXING`, `READY`, `FAILED`, `REMOVING` |
| `MessageRole` | `USER`, `ASSISTANT`, `SYSTEM` |

---

## 8. API Contract

### Notebooks

| Method | Route | Description | Auth |
|---|---|---|---|
| `GET` | `/api/notebooks` | List all notebooks for authenticated user | ✅ |
| `POST` | `/api/notebooks` | Create a new notebook | ✅ |
| `GET` | `/api/notebooks/:id` | Get notebook details | ✅ |
| `PATCH` | `/api/notebooks/:id` | Rename / update notebook | ✅ |
| `DELETE` | `/api/notebooks/:id` | Delete notebook + cascade | ✅ |
| `GET` | `/api/notebooks/:id/stats` | Source count, chunks, questions, storage | ✅ |
| `POST` | `/api/notebooks/:id/summary` | Generate AI summary | ✅ |

### Sources

| Method | Route | Description | Auth |
|---|---|---|---|
| `POST` | `/api/sources/upload` | Upload & begin processing a source (multipart) | ✅ |
| `GET` | `/api/sources?notebookId=` | List sources for a notebook | ✅ |
| `GET` | `/api/sources/:id` | Get source details + status | ✅ |
| `DELETE` | `/api/sources/:id` | Delete source + vectors | ✅ |
| `POST` | `/api/sources/:id/reindex` | Re-process source | ✅ |
| `GET` | `/api/sources/:id/chunks` | Retrieve chunks for viewer | ✅ |

### Chat

| Method | Route | Description | Auth |
|---|---|---|---|
| `POST` | `/api/chat` | Stream RAG response (SSE) | ✅ |
| `GET` | `/api/chat/history?conversationId=` | Get conversation history | ✅ |
| `POST` | `/api/chat/suggestions` | Generate 3 follow-up questions | ✅ |

### Search

| Method | Route | Description | Auth |
|---|---|---|---|
| `POST` | `/api/search` | Semantic vector search within a notebook | ✅ |

### YouTube

| Method | Route | Description | Auth |
|---|---|---|---|
| `POST` | `/api/youtube` | Pre-fetch YouTube transcript | ✅ |

### Common Request/Response Conventions

- All request bodies MUST be `application/json` (except source upload which is `multipart/form-data`)
- All responses MUST be `application/json` (except `/api/chat` which is `text/event-stream`)
- Error responses MUST follow `{ error: string, details?: unknown }` shape
- Auth failures return `401 Unauthorized`
- Authorization failures (wrong owner) return `403 Forbidden`
- Not-found resources return `404 Not Found`

---

## 9. RAG Pipeline Specification

The RAG pipeline is a 10-stage process executed per chat query. All stages MUST be logged with their state transitions.

```
User Query
    │
    ▼
[Stage 1] Page Query Detection
    │  IF "page X" pattern detected → direct DB lookup → skip to streaming
    │
    ▼
[Stage 2] Query Decomposition
    │  Break complex query into ≤4 atomic sub-queries
    │
    ▼
[Stage 3] Step-Back Prompting
    │  Generate 1 broader context query
    │
    ▼
[Stage 4] Query Rewrite
    │  Fix spelling, resolve ambiguity, remove redundancy
    │
    ▼
[Stage 5] HyDE Generation
    │  Generate a hypothetical answer document per sub-query
    │
    ▼
[Stage 6] Multi-Query Parallel Retrieval (Promise.allSettled)
    │  - Original query embedding → pgvector search
    │  - HyDE embeddings → pgvector search
    │  - Step-back embedding → pgvector search
    │  - Sub-query embeddings → pgvector search
    │  Top K=8 per query, notebook-scoped
    │
    ▼
[Stage 7] Chunk Deduplication
    │  Remove duplicate/near-duplicate chunks by ID
    │
    ▼
[Stage 8] Chunk Grouping & MMR
    │  Group by source/topic coherence
    │  Apply Maximal Marginal Relevance for diversity
    │
    ▼
[Stage 9] RRF Ranking (Reciprocal Rank Fusion)
    │  Merge multiple ranked lists → select top 5 groups
    │
    ▼
[Stage 10] Progressive Response Generation
    ├── Fast Generic Path: stream generic answer immediately
    └── Background Refinement (parallel):
            → Grounded answer with full context chunks
            → Merge + confidence boost
            → Emit citations
```

### Pipeline State Machine

```
IDLE → DECOMPOSING → RETRIEVING → RANKING → GENERATING → STREAMING → COMPLETE
                                                │
                                                └── REFINING (parallel background)
                                                        ↓
                                                    MERGED
```

### Embedding Specification

| Property | Value |
|---|---|
| Model | `text-embedding-3-small` |
| Dimensions | 1536 |
| Index Type | HNSW (pgvector) |
| Scope | Per-notebook (`notebookId` filter on all queries) |

---

## 10. Source Processing Pipeline

```
Upload → Extract → Clean → Chunk → Embed → Store in pgvector
```

### Extraction Methods

| Source Type | Extraction | Chunking |
|---|---|---|
| **PDF** | `pdf-parse` (page-aware) | `RecursiveCharacterTextSplitter`; chunks tagged with `pageNumber` |
| **Website** | `@mozilla/readability` + `cheerio` (strips nav/footer/ads) | `RecursiveCharacterTextSplitter` |
| **VTT** | Custom parser (timestamp segments) | Segment-level chunking; chunks tagged with `timestamp` |
| **Plain Text** | Direct | `RecursiveCharacterTextSplitter` |
| **YouTube** | `youtube-transcript` / `youtube-transcript-api-js` | Segment-level (⚠ see §15) |

### Chunking Configuration

| Parameter | Value |
|---|---|
| Splitter | LangChain `RecursiveCharacterTextSplitter` |
| Chunk Size | TBD (configurable) |
| Chunk Overlap | TBD (configurable) |
| Separators | `["\n\n", "\n", " ", ""]` |

### Processing State Transitions

```
UPLOADING → INDEXING → READY
    │            │
    ▼            ▼
  FAILED       FAILED
    │            │
    ▼            ▼
 (retry)    (reindex via POST /api/sources/:id/reindex)
```

---

## 11. State Machines

### Source Processing

| From | Event | To |
|---|---|---|
| `UPLOADING` | File stored, processing starts | `INDEXING` |
| `UPLOADING` | Storage error | `FAILED` |
| `INDEXING` | Chunks + embeddings stored | `READY` |
| `INDEXING` | Extraction or embedding error | `FAILED` |
| `FAILED` | User triggers reindex | `INDEXING` |
| `READY` | User triggers reindex | `INDEXING` |
| `READY` | User deletes source | `REMOVING` |

### RAG Pipeline

| From | Event | To |
|---|---|---|
| `IDLE` | Query submitted | `DECOMPOSING` |
| `DECOMPOSING` | Sub-queries generated | `RETRIEVING` |
| `RETRIEVING` | Chunks retrieved | `RANKING` |
| `RANKING` | RRF complete | `GENERATING` |
| `GENERATING` | Stream started | `STREAMING` |
| `GENERATING` | Background refine started | `REFINING` (parallel) |
| `STREAMING` + `REFINING` | Both complete | `MERGED` → `COMPLETE` |

---

## 12. Security Requirements

| ID | Control |
|---|---|
| SEC-01 | **Authentication** — All non-public routes protected by Clerk middleware (`middleware.ts`) |
| SEC-02 | **Authorization** — Every database query for notebooks/sources MUST include `userId` from the authenticated Clerk session; IDOR is a critical failure |
| SEC-03 | **Secret Management** — `AI_API_KEY`, `CLERK_SECRET_KEY`, `DATABASE_URL` MUST be server-only env vars; never exposed to the client bundle |
| SEC-04 | **Input Validation** — All API inputs validated with Zod before reaching business logic |
| SEC-05 | **File Uploads** — MIME type and file size MUST be validated server-side before processing |
| SEC-06 | **Database** — Neon PostgreSQL connection MUST use `sslmode=require` |
| SEC-07 | **Cascade Deletes** — All Prisma relations use `onDelete: Cascade` to prevent orphaned data |

---

## 13. Environment Configuration

```env
# ── Database ──────────────────────────────────────────────
DATABASE_URL="postgresql://user:pass@host.neon.tech/kitabllm?sslmode=require"

# ── Clerk Authentication ───────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"

# ── AI / LLM ──────────────────────────────────────────────
AI_BASE_URL="https://aicredits.in/v1"      # OpenAI-compatible endpoint
AI_API_KEY="your-api-key"
CHAT_MODEL="gpt-4.1"
EMBEDDING_MODEL="text-embedding-3-small"
```

> [!IMPORTANT]
> `NEXT_PUBLIC_*` variables are exposed to the browser bundle. Never prefix secret keys with `NEXT_PUBLIC_`.

---

## 14. Deployment Requirements

### Local Development

```bash
bun install
cp .env.example .env    # Fill in credentials
bunx prisma migrate dev  # Run DB migrations
bun run dev              # Start dev server (Turbopack)
```

### Docker (Local pgvector)

```bash
docker-compose up -d    # Starts pgvector/pg16 on port 5432
bun run dev
```

The `docker-compose.yml` provisions:
- `pgvector/pgvector:pg16` on port `5432`
- A named volume `pgdata` for persistence
- A named volume `uploads` for file storage

### Production (Render)

| Setting | Value |
|---|---|
| Build Command | `bun install; bun run build` |
| Start Command | `bun run start` |
| Build includes | `bunx prisma generate && next build` |

### Docker (Production)

```bash
docker build -t kitabllm .
docker run -p 3000:3000 --env-file .env kitabllm
```

### Build Verification Checklist

At each deployment checkpoint, the following MUST pass:

- [ ] `bun run build` — No build errors
- [ ] TypeScript — Zero type errors
- [ ] `bun run lint` — ESLint clean
- [ ] Manual smoke test — Core flows verified
- [ ] No regressions — Previously working features confirmed

---

## 15. Known Limitations & Constraints

| Constraint | Detail | Workaround |
|---|---|---|
| **YouTube Transcripts** | YouTube blocks data center IPs (Render, AWS, GCP). Transcript fetch works only on residential IPs (local dev). | Upload a `.vtt` subtitle file instead |
| **PDF Viewer (Cross-Origin)** | The PDF viewer requires the file to be served from the same origin. Cloud hosting may break direct PDF rendering. | System falls back to excerpt-only viewer mode |
| **No Full-Text Search** | Search is semantic (vector) only; no keyword/BM25 hybrid search implemented | Use semantic search with paraphrased queries |
| **Single-User File Storage** | Files are stored in a local `uploads/` directory. No CDN or S3 integration. | Mount a persistent volume in Docker/Render |
| **No Real-Time Collaboration** | Notebooks are strictly per-user; no sharing or collaboration features | — |

---

*Document generated: 2026-08-01 | Version: 0.1.0*
