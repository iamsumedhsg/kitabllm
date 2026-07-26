# KitabLLM - Implementation Plan

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Next.js App Router)                  │
├──────────┬──────────────┬────────────────┬─────────────────────────┤
│ Sidebar  │  Source Panel │  Chat Interface │  Source Viewer (Right) │
│ Notebooks│  Upload/List  │  Streaming AI   │  PDF/YT/Web/Text      │
└──────┬───┴──────┬───────┴───────┬────────┴──────────┬──────────────┘
       │          │               │                   │
       ▼          ▼               ▼                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    API LAYER (Next.js Route Handlers)                │
├──────────┬──────────────┬────────────────┬──────────────────────────┤
│ Notebook │   Source     │    Chat        │  Search                  │
│ CRUD     │   Pipeline   │    RAG Engine  │  Semantic + Full-text    │
└──────┬───┴──────┬───────┴───────┬────────┴──────────┬──────────────┘
       │          │               │                   │
       ▼          ▼               ▼                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                                   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────────┐ │
│  │ Source      │  │ Embedding    │  │ RAG Query Engine            │ │
│  │ Processor   │  │ Service      │  │                            │ │
│  │             │  │              │  │ ┌──────────────────────┐   │ │
│  │ - PDF Parse │  │ - text-emb-  │  │ │ Query Decomposition  │   │ │
│  │ - YT Trans  │  │   3-small    │  │ │ - Sub-queries        │   │ │
│  │ - Web Scrape│  │ - Chunking   │  │ │ - Step-back          │   │ │
│  │ - VTT Parse │  │ - pgvector   │  │ │ - Query rewrite      │   │ │
│  │ - Text      │  │              │  │ │ - HyDE generation    │   │ │
│  └─────────────┘  └──────────────┘  │ └──────────────────────┘   │ │
│                                      │ ┌──────────────────────┐   │ │
│                                      │ │ Retrieval & Ranking  │   │ │
│                                      │ │ - Vector similarity  │   │ │
│                                      │ │ - MMR retrieval      │   │ │
│                                      │ │ - RRF fusion         │   │ │
│                                      │ │ - Chunk grouping     │   │ │
│                                      │ └──────────────────────┘   │ │
│                                      │ ┌──────────────────────┐   │ │
│                                      │ │ Progressive Response │   │ │
│                                      │ │ - Generic start      │   │ │
│                                      │ │ - Background refine  │   │ │
│                                      │ │ - Confidence boost   │   │ │
│                                      │ └──────────────────────┘   │ │
│                                      └────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
       │          │               │                   │
       ▼          ▼               ▼                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                      │
├──────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────────────────────────────┐ │
│  │ Neon PostgreSQL  │  │ pgvector Extension                       │ │
│  │ (Prisma ORM)     │  │ - Embeddings (1536 dim)                  │ │
│  │                  │  │ - HNSW Index                             │ │
│  │ - Notebooks      │  │ - Notebook-scoped queries                │ │
│  │ - Sources        │  │                                          │ │
│  │ - Chunks         │  └──────────────────────────────────────────┘ │
│  │ - Conversations  │                                               │
│  │ - Messages       │  ┌──────────────────────────────────────────┐ │
│  │ - Citations      │  │ File Storage (Local/Uploads dir)         │ │
│  └──────────────────┘  └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

---

## RAG Pipeline Design

### Query Processing Flow

```
User Query
    │
    ▼
┌─────────────────────────┐
│ 1. Sub-Query Generation │  Break complex queries into atomic sub-queries
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 2. Step-Back Prompting  │  Generate broader context queries
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 3. Query Rewrite        │  Fix spelling, resolve ambiguity, remove redundancy
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 4. HyDE Generation      │  Generate hypothetical document for each query
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────────────────────────────┐
│ 5. Multi-Query Retrieval (Parallel)             │
│    - Original query embeddings → vector search  │
│    - HyDE embeddings → vector search            │
│    - Step-back embeddings → vector search       │
│    - Sub-query embeddings → vector search       │
└───────────┬─────────────────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│ 6. Chunk Deduplication  │  Remove duplicate/near-duplicate chunks
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 7. Chunk Grouping       │  Group by source/topic coherence
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────────────┐
│ 8. RRF (Reciprocal Rank Fusion) │  Rank and select top 5 groups
└───────────┬─────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────┐
│ 9. Progressive Response Generation              │
│    ┌───────────────────┐  ┌──────────────────┐  │
│    │ Fast Generic Path │  │ Background Refine│  │
│    │ (Stream start)    │  │ (Parallel)       │  │
│    └─────────┬─────────┘  └────────┬─────────┘  │
│              │                     │             │
│              ▼                     ▼             │
│    ┌─────────────────────────────────────┐      │
│    │ Merge & Confidence Boost            │      │
│    │ (Citations + grounded answer)       │      │
│    └─────────────────────────────────────┘      │
└─────────────────────────────────────────────────┘
```

---

## Database Schema (Prisma)

```prisma
model User {
  id            String     @id @default(cuid())
  clerkId       String     @unique
  email         String     @unique
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
  notebooks     Notebook[]
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
  id            String       @id @default(cuid())
  notebookId    String
  notebook      Notebook     @relation(fields: [notebookId], references: [id], onDelete: Cascade)
  filename      String
  type          SourceType
  size          Int
  url           String?
  filePath      String?
  status        SourceStatus @default(UPLOADING)
  metadata      Json?
  chunks        Chunk[]
  citations     Citation[]
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  @@index([notebookId])
}

model Chunk {
  id            String     @id @default(cuid())
  sourceId      String
  source        Source     @relation(fields: [sourceId], references: [id], onDelete: Cascade)
  content       String
  chunkNumber   Int
  pageNumber    Int?
  timestamp     String?
  title         String?
  url           String?
  embedding     Unsupported("vector(1536)")?
  metadata      Json?
  citations     Citation[]
  createdAt     DateTime   @default(now())

  @@index([sourceId])
}

model Conversation {
  id            String    @id @default(cuid())
  notebookId    String
  notebook      Notebook  @relation(fields: [notebookId], references: [id], onDelete: Cascade)
  title         String?
  messages      Message[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([notebookId])
}

model Message {
  id              String       @id @default(cuid())
  conversationId  String
  conversation    Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  role            MessageRole
  content         String
  citations       Citation[]
  createdAt       DateTime     @default(now())

  @@index([conversationId])
}

model Citation {
  id            String   @id @default(cuid())
  messageId     String
  message       Message  @relation(fields: [messageId], references: [id], onDelete: Cascade)
  sourceId      String
  source        Source   @relation(fields: [sourceId], references: [id], onDelete: Cascade)
  chunkId       String
  chunk         Chunk    @relation(fields: [chunkId], references: [id], onDelete: Cascade)
  pageNumber    Int?
  timestamp     String?
  confidence    Float?
  excerpt       String?
  createdAt     DateTime @default(now())

  @@index([messageId])
  @@index([sourceId])
}

enum SourceType {
  PDF
  TEXT
  WEBSITE
  YOUTUBE
  VTT
}

enum SourceStatus {
  UPLOADING
  INDEXING
  READY
  FAILED
  REMOVING
}

enum MessageRole {
  USER
  ASSISTANT
  SYSTEM
}
```

---

## Folder Structure

```
kitabllm/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   └── sign-up/[[...sign-up]]/page.tsx
│   ├── (main)/
│   │   ├── layout.tsx               # Main app layout with sidebar
│   │   ├── page.tsx                  # Dashboard / notebook list
│   │   └── notebook/
│   │       └── [id]/
│   │           ├── page.tsx          # Notebook workspace (chat + sources)
│   │           └── layout.tsx
│   ├── api/
│   │   ├── notebooks/
│   │   │   ├── route.ts             # GET, POST
│   │   │   └── [id]/
│   │   │       └── route.ts         # GET, PATCH, DELETE
│   │   ├── sources/
│   │   │   ├── upload/route.ts      # POST - file upload
│   │   │   ├── [id]/
│   │   │   │   ├── route.ts         # GET, DELETE
│   │   │   │   ├── reindex/route.ts # POST
│   │   │   │   └── content/route.ts # GET - source content
│   │   │   └── route.ts             # GET all sources for notebook
│   │   ├── chat/
│   │   │   ├── route.ts             # POST - streaming chat
│   │   │   └── history/route.ts     # GET
│   │   └── search/
│   │       └── route.ts             # POST - semantic search
│   ├── layout.tsx                    # Root layout with providers
│   ├── globals.css
│   └── favicon.ico
├── components/
│   ├── ui/                           # shadcn/ui components
│   ├── layout/
│   │   ├── app-sidebar.tsx
│   │   ├── header.tsx
│   │   └── theme-toggle.tsx
│   ├── notebook/
│   │   ├── notebook-card.tsx
│   │   ├── notebook-list.tsx
│   │   └── create-notebook-dialog.tsx
│   ├── source/
│   │   ├── source-card.tsx
│   │   ├── source-list.tsx
│   │   ├── source-uploader.tsx
│   │   ├── upload-progress.tsx
│   │   └── indexing-indicator.tsx
│   ├── chat/
│   │   ├── chat-window.tsx
│   │   ├── chat-input.tsx
│   │   ├── chat-message.tsx
│   │   ├── citation-chip.tsx
│   │   └── citation-list.tsx
│   ├── viewer/
│   │   ├── source-viewer.tsx
│   │   ├── pdf-viewer.tsx
│   │   ├── website-viewer.tsx
│   │   ├── transcript-viewer.tsx
│   │   └── youtube-viewer.tsx
│   └── search/
│       └── search-bar.tsx
├── lib/
│   ├── db.ts                         # Prisma client singleton
│   ├── ai/
│   │   ├── embeddings.ts             # Embedding generation
│   │   ├── llm.ts                    # LLM client config
│   │   ├── rag/
│   │   │   ├── query-decomposer.ts   # Sub-query generation
│   │   │   ├── step-back.ts          # Step-back prompting
│   │   │   ├── query-rewriter.ts     # Query rewrite/cleanup
│   │   │   ├── hyde.ts               # Hypothetical document embeddings
│   │   │   ├── retriever.ts          # Vector retrieval + MMR
│   │   │   ├── ranker.ts             # RRF ranking
│   │   │   ├── progressive.ts        # Progressive response generation
│   │   │   └── pipeline.ts           # Orchestrates full RAG pipeline
│   │   └── prompts/
│   │       ├── system.ts             # System prompts
│   │       ├── rag.ts                # RAG-specific prompts
│   │       └── decompose.ts          # Query decomposition prompts
│   ├── processing/
│   │   ├── pdf.ts                    # PDF text extraction
│   │   ├── youtube.ts                # YouTube transcript extraction
│   │   ├── website.ts                # Web content extraction
│   │   ├── vtt.ts                    # VTT parsing
│   │   ├── text.ts                   # Plain text processing
│   │   ├── chunker.ts               # RecursiveCharacterTextSplitter
│   │   └── pipeline.ts              # Source processing orchestrator
│   ├── vectors/
│   │   ├── store.ts                  # pgvector operations
│   │   └── search.ts                 # Vector similarity search
│   ├── validators/
│   │   ├── notebook.ts               # Zod schemas for notebooks
│   │   ├── source.ts                 # Zod schemas for sources
│   │   ├── chat.ts                   # Zod schemas for chat
│   │   └── common.ts                 # Shared validators
│   └── utils.ts                      # Utility functions
├── hooks/
│   ├── use-notebooks.ts              # React Query hooks for notebooks
│   ├── use-sources.ts                # React Query hooks for sources
│   ├── use-chat.ts                   # Chat hook with streaming
│   └── use-search.ts                 # Search hook
├── store/
│   ├── notebook-store.ts             # Zustand store for notebook state
│   ├── source-store.ts               # Source panel state
│   ├── chat-store.ts                 # Chat state
│   └── viewer-store.ts              # Source viewer state
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
├── types/
│   └── index.ts                      # Shared TypeScript types
├── .env.example
├── .env.local
├── docker-compose.yml
├── Dockerfile
├── next.config.ts
├── tailwind.config.ts
├── package.json
├── plan.md
└── README.md
```

---

## Implementation Phases & Checkpoints

### Phase 1: Project Foundation
**Checkpoint 1A - Dependencies & Config**
- Install all core dependencies (shadcn/ui, prisma, zustand, react-query, framer-motion, etc.)
- Configure shadcn/ui with Tailwind
- Setup Prisma with Neon PG connection string placeholder
- Configure path aliases and TypeScript

**Checkpoint 1B - Database Schema**
- Create Prisma schema with all models
- Setup pgvector extension
- Generate Prisma client
- Create migration

**Commit**: `feat: project foundation - deps, prisma schema, shadcn/ui setup`

---

### Phase 2: Authentication & Database
**Checkpoint 2A - Clerk Integration**
- Install @clerk/nextjs
- Setup middleware
- Configure ClerkProvider
- Create sign-in/sign-up pages
- Add auth controls to layout

**Checkpoint 2B - Database Connection**
- Configure Neon PG connection
- Run migrations
- Test database connectivity
- Create db utility (Prisma singleton)

**Commit**: `feat: clerk auth + neon pg database connection`

---

### Phase 3: Core UI & Layout
**Checkpoint 3A - App Shell**
- Main layout with sidebar
- Header with theme toggle + user button
- Responsive sidebar (collapsible)
- Dark/light mode

**Checkpoint 3B - Notebook Management**
- Notebook CRUD API routes
- Notebook list in sidebar
- Create/rename/delete notebook dialogs
- Notebook workspace page shell

**Commit**: `feat: app shell, sidebar, notebook CRUD`

---

### Phase 4: Source Management
**Checkpoint 4A - Source Upload**
- Source upload API route (multipart)
- Upload dialog (PDF, Text, URL, YouTube, VTT)
- Source cards with status indicators
- File storage (local uploads directory)

**Checkpoint 4B - Content Extraction**
- PDF text extraction (pdf-parse)
- Website extraction (readability + cheerio)
- YouTube transcript extraction
- VTT parser
- Plain text handler

**Checkpoint 4C - Processing Pipeline**
- Chunking with LangChain RecursiveCharacterTextSplitter
- Background processing with status updates
- Error handling and retry logic

**Commit**: `feat: source management - upload, extract, chunk`

---

### Phase 5: RAG Pipeline
**Checkpoint 5A - Embeddings & Vector Store**
- OpenAI embedding generation (text-embedding-3-small)
- pgvector storage operations
- Vector similarity search (top K=8)
- MMR retrieval implementation
- Notebook-scoped filtering

**Checkpoint 5B - Query Processing**
- Sub-query decomposition
- Step-back prompting
- Query rewrite (spelling, disambiguation)
- HyDE (Hypothetical Document Embeddings)
- Query routing adapter

**Checkpoint 5C - Retrieval & Ranking**
- Multi-query parallel retrieval
- Chunk deduplication
- Chunk grouping by source/topic
- RRF (Reciprocal Rank Fusion) ranking
- Top 5 group selection

**Checkpoint 5D - Progressive Response**
- Generic fast-start response (stream immediately)
- Background refinement pipeline (parallel)
- Confidence boosting merge
- State machine for pipeline stages

**Commit**: `feat: full RAG pipeline - query processing, retrieval, ranking, progressive response`

---

### Phase 6: Chat Interface
**Checkpoint 6A - Chat UI**
- Chat window component
- Message rendering (Markdown, code, LaTeX, tables)
- Chat input with submit
- Auto-scroll, typing indicator
- Stop generation, regenerate

**Checkpoint 6B - Streaming & Citations**
- Vercel AI SDK streaming integration
- Citation generation during response
- Citation chips (source name, page, timestamp)
- Click citation → open source viewer

**Checkpoint 6C - Source Viewer**
- Right panel (resizable)
- PDF viewer with page jump + highlight
- YouTube embedded player with timestamp jump
- Website preview with highlight
- Transcript viewer with line highlight
- Plain text viewer with paragraph highlight

**Commit**: `feat: chat interface with streaming, citations, source viewer`

---

### Phase 7: Polish & Advanced Features
**Checkpoint 7A - Search & Dashboard**
- Search across notebooks, sources, chats
- Notebook dashboard (stats: sources, chunks, questions, storage)

**Checkpoint 7B - Bonus Features**
- Follow-up question suggestions
- AI notebook summary
- Semantic search (without chat)

**Checkpoint 7C - Final Polish**
- Error handling (toasts, retry)
- Loading states, optimistic UI
- Performance (virtual scrolling, debounced search, lazy load)
- Responsive design
- Accessibility

**Commit**: `feat: search, dashboard, bonus features, polish`

---

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@your-neon-host.neon.tech/kitabllm?sslmode=require"

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"

# AI / LLM
AI_BASE_URL="https://aicredits.in/v1"
AI_API_KEY="your-api-key-here"

# Embeddings
EMBEDDING_MODEL="text-embedding-3-small"
CHAT_MODEL="gpt-4.1"
```

---

## Key Design Decisions

1. **pgvector over Pinecone** - Keeps everything in one database, simpler ops, lower cost
2. **Progressive response** - Start streaming generic answer immediately while background pipeline refines with better chunks
3. **RRF ranking** - Combines multiple retrieval strategies without needing a trained reranker
4. **Notebook isolation** - All vector queries are scoped to notebook ID, preventing cross-notebook leakage
5. **Background indexing** - Source processing runs async, UI shows real-time status updates
6. **State machines** - Pipeline stages managed with explicit states for reliability and debuggability
7. **Zod everywhere** - Input/output validation at API boundaries and between pipeline stages

---

## State Machine: Source Processing

```
UPLOADING → INDEXING → READY
    │          │
    ▼          ▼
  FAILED     FAILED
    │          │
    ▼          ▼
  (retry)   (reindex)
```

## State Machine: RAG Pipeline

```
IDLE → DECOMPOSING → RETRIEVING → RANKING → GENERATING → STREAMING → COMPLETE
                                                │
                                                ├── REFINING (parallel)
                                                │
                                                ▼
                                            MERGED
```

---

## API Contract Summary

| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/notebooks | Create notebook |
| GET | /api/notebooks | List user notebooks |
| GET | /api/notebooks/:id | Get notebook details |
| PATCH | /api/notebooks/:id | Update notebook |
| DELETE | /api/notebooks/:id | Delete notebook + cascade |
| POST | /api/sources/upload | Upload source file |
| GET | /api/sources?notebookId= | List sources for notebook |
| GET | /api/sources/:id | Get source details |
| DELETE | /api/sources/:id | Delete source + vectors |
| POST | /api/sources/:id/reindex | Re-index source |
| GET | /api/sources/:id/content | Get source content |
| POST | /api/chat | Stream chat response |
| GET | /api/chat/history?conversationId= | Get chat history |
| POST | /api/search | Semantic search |

---

## Docker Setup

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL
      - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
      - CLERK_SECRET_KEY
      - AI_BASE_URL
      - AI_API_KEY
    depends_on:
      - db
    volumes:
      - uploads:/app/uploads

  db:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: kitabllm
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
  uploads:
```

---

## Checkpoint Verification Protocol

At each checkpoint, verify:
1. **Build passes** - `bun run build` succeeds
2. **Types check** - No TypeScript errors
3. **Lint passes** - ESLint clean
4. **Feature works** - Manual verification of the feature
5. **No regressions** - Previously working features still work

Report to user at each checkpoint what was accomplished and what's next.
