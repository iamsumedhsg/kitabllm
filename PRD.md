# Product Requirements Document (PRD)
## KitabLLM — AI Research Notebook

| Field | Value |
|---|---|
| **Product** | KitabLLM |
| **Version** | 0.1.0 |
| **Live URL** | https://kitabllm.issg.me |
| **Document Date** | 2026-08-01 |
| **Status** | Active Development |

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [Problem Statement](#2-problem-statement)
3. [Target Users & Personas](#3-target-users--personas)
4. [Goals & Success Metrics](#4-goals--success-metrics)
5. [User Stories](#5-user-stories)
6. [Feature Requirements](#6-feature-requirements)
7. [User Experience Requirements](#7-user-experience-requirements)
8. [Out of Scope](#8-out-of-scope)
9. [Assumptions & Dependencies](#9-assumptions--dependencies)
10. [Release Roadmap](#10-release-roadmap)
11. [Open Questions](#11-open-questions)

---

## 1. Product Vision

**KitabLLM** is a self-hosted AI research assistant that turns your documents into a queryable knowledge base — with every answer citing its source.

> *"Read less. Know more. Trust the source."*

Think Google NotebookLM, but **fully self-hosted**, **privacy-first**, and **production-grade**.

### Why KitabLLM?

| Problem | KitabLLM Solution |
|---|---|
| AI hallucinations — answers with no basis | Every response is grounded in uploaded sources with page-level citations |
| Reading 200-page PDFs to find one answer | Ask a question, get the answer + exact passage in seconds |
| Scattered research materials | Organized into isolated notebooks; no cross-contamination |
| Vendor lock-in to proprietary tools | Fully self-hostable; bring your own API key |
| No proof of where an answer came from | Citations link to specific pages, timestamps, and passages |

---

## 2. Problem Statement

Researchers, students, and knowledge workers routinely need to extract insights from large volumes of documents — PDFs, web pages, video transcripts, and notes. Current workflows are slow and error-prone:

- **Manual reading** of large documents is time-consuming.
- **Generic AI chat** (ChatGPT, etc.) invents answers not grounded in actual materials.
- **Existing tools** (NotebookLM) are cloud-only, privacy-invasive, and not self-hostable.
- **There is no accountability** — AI answers cannot be traced back to a specific source passage.

KitabLLM solves this by combining a multi-stage Retrieval-Augmented Generation (RAG) pipeline with a clean, citation-first UI.

---

## 3. Target Users & Personas

### Persona 1 — The Academic Researcher
- **Name:** Aryan, PhD student
- **Goal:** Quickly find relevant passages across 30 research papers
- **Pain point:** Spending hours reading papers to locate a single referenced fact
- **How KitabLLM helps:** Upload all PDFs into one notebook, ask questions, jump to cited page instantly

### Persona 2 — The Self-Hosting Developer
- **Name:** Priya, indie developer / privacy advocate
- **Goal:** Run their own AI assistant without sending documents to Google or OpenAI
- **Pain point:** Cloud tools require trusting third parties with sensitive documents
- **How KitabLLM helps:** Docker-deployable, bring-your-own API key, data stays on your server

### Persona 3 — The Student
- **Name:** Rahul, undergraduate student
- **Goal:** Study from lecture transcripts, PDFs, and websites efficiently
- **Pain point:** Long documents are overwhelming; highlights don't capture context
- **How KitabLLM helps:** Upload VTT transcripts and PDFs; generate flashcards and summaries; ask targeted questions

### Persona 4 — The Professional Analyst
- **Name:** Sneha, business analyst
- **Goal:** Extract key insights from industry reports and meeting recordings
- **Pain point:** Manually reviewing 100-page reports before a deadline
- **How KitabLLM helps:** Upload reports, ask "What are the key risks?", get a cited answer in seconds

---

## 4. Goals & Success Metrics

### Product Goals

| Goal | Description |
|---|---|
| **Trustworthy Answers** | 100% of AI responses include verifiable citations back to source material |
| **Fast Time-to-Insight** | Users get a first streamed response within 3 seconds of querying |
| **Ease of Use** | A new user can upload a document and get a cited answer within 2 minutes |
| **Self-Hostability** | Any developer can deploy KitabLLM with Docker in under 15 minutes |
| **Multi-Source Support** | Support at least 4 source types: PDF, Website, VTT, Plain Text |

### Success Metrics (KPIs)

| Metric | Target |
|---|---|
| Time to first streamed token | < 3 seconds |
| Source indexing time (per 10 pages) | < 30 seconds |
| Citation accuracy (answer grounded in cited chunk) | > 95% |
| Setup time for self-hosted deployment | < 15 minutes |
| User retention (returns within 7 days) | > 60% |

---

## 5. User Stories

### Authentication

| ID | As a... | I want to... | So that... |
|---|---|---|---|
| US-AUTH-01 | new user | sign up with email | I can create my account |
| US-AUTH-02 | returning user | sign in securely | I can access my notebooks |
| US-AUTH-03 | user | have my data isolated from other users | my research stays private |

### Notebook Management

| ID | As a... | I want to... | So that... |
|---|---|---|---|
| US-NB-01 | researcher | create a new notebook | I can organize sources by topic or project |
| US-NB-02 | researcher | rename a notebook | I can keep my workspace organized |
| US-NB-03 | researcher | delete a notebook | I can remove projects I no longer need |
| US-NB-04 | researcher | see notebook stats | I know how many sources, chunks, and questions exist |
| US-NB-05 | researcher | generate an AI summary of a notebook | I get a quick overview without reading everything |

### Source Management

| ID | As a... | I want to... | So that... |
|---|---|---|---|
| US-SRC-01 | user | upload a PDF | I can ask questions about its content |
| US-SRC-02 | user | paste a website URL | I can query web content without copying text |
| US-SRC-03 | user | upload a VTT subtitle file | I can search through video/lecture transcripts |
| US-SRC-04 | user | paste plain text | I can add notes or snippets as sources |
| US-SRC-05 | user | see the indexing status of my sources | I know when a source is ready to query |
| US-SRC-06 | user | delete a source | I can remove irrelevant or outdated material |
| US-SRC-07 | user | re-index a failed source | I can recover without re-uploading the file |

### Chat & Querying

| ID | As a... | I want to... | So that... |
|---|---|---|---|
| US-CHAT-01 | researcher | ask a question about my sources | I get a fast, relevant answer |
| US-CHAT-02 | researcher | see the answer stream in real-time | I don't stare at a loading spinner |
| US-CHAT-03 | researcher | see citations with every answer | I can verify exactly where the information came from |
| US-CHAT-04 | researcher | ask "what's on page 35?" | I can quickly access specific document pages |
| US-CHAT-05 | researcher | view my conversation history | I can revisit past questions and answers |
| US-CHAT-06 | researcher | see follow-up question suggestions | I can dig deeper without thinking of new questions |
| US-CHAT-07 | researcher | copy an AI response | I can paste answers into my own notes |
| US-CHAT-08 | researcher | see responses formatted as Markdown | Complex answers with lists and code render properly |

### Source Viewer

| ID | As a... | I want to... | So that... |
|---|---|---|---|
| US-VIEW-01 | researcher | click a citation to open the source | I can read the original context in-app |
| US-VIEW-02 | researcher | have the source jump to the cited page | I don't have to scroll through the whole document |
| US-VIEW-03 | researcher | see highlighted passages in the viewer | The cited text is immediately visible |
| US-VIEW-04 | researcher | view YouTube transcripts with timestamp links | I can jump to the exact moment in a video |

### Search

| ID | As a... | I want to... | So that... |
|---|---|---|---|
| US-SRCH-01 | researcher | search my notebook semantically | I can find relevant content without an exact keyword match |
| US-SRCH-02 | researcher | get search results scoped to the current notebook | I don't see results from unrelated projects |

---

## 6. Feature Requirements

### 6.1 Core Features (Must Have — v0.1.0)

| Feature | Description | Priority |
|---|---|---|
| **User Authentication** | Sign in / sign up via Clerk. All data scoped per user. | P0 |
| **Notebook CRUD** | Create, rename, delete notebooks. Dashboard with stats. | P0 |
| **Source Upload** | Upload PDF, paste URL, upload VTT, paste text. Async processing with status. | P0 |
| **Multi-Stage RAG Chat** | 10-stage RAG pipeline: decomposition → HyDE → retrieval → RRF → streaming. | P0 |
| **Streaming Responses** | Real-time SSE streaming with pipeline stage indicators. | P0 |
| **Citations** | Every response includes source name, page/timestamp, confidence, excerpt. | P0 |
| **Source Viewer** | Right-panel viewer for PDF, website, transcript. Click citation → jump to location. | P0 |
| **Page-Aware Queries** | "What's on page X?" short-circuits to direct DB lookup. | P0 |
| **Dark / Light Mode** | Theme toggle with persistent preference. | P0 |
| **Semantic Search** | Vector search within a notebook without chat. | P1 |

### 6.2 Enhanced Features (Should Have — v0.2.0)

| Feature | Description | Priority |
|---|---|---|
| **AI Notebook Summary** | Generate executive summary, flashcards, or quiz from all sources. | P1 |
| **Follow-Up Suggestions** | 3 contextual follow-up questions after each answer. | P1 |
| **Source Re-indexing** | Re-process a failed or updated source without re-uploading. | P1 |
| **Copy Response Button** | One-click copy on any AI response. | P1 |
| **Conversation History** | Persist and display past chat conversations per notebook. | P1 |

### 6.3 Future Features (Nice to Have — v0.3.0+)

| Feature | Description | Priority |
|---|---|---|
| **YouTube Transcript (Cloud)** | Fetch transcripts on cloud hosting (requires residential proxy). | P2 |
| **BM25 Hybrid Search** | Combine vector search with keyword search for better precision. | P2 |
| **Notebook Sharing** | Share notebooks with other users (read-only link). | P2 |
| **S3 / Cloud File Storage** | Replace local `uploads/` dir with S3-compatible storage. | P2 |
| **Bulk Source Import** | Upload multiple PDFs or URLs in one batch. | P2 |
| **Export Chat** | Export conversation as Markdown or PDF. | P3 |
| **Mobile Responsive UI** | Full support for tablet and mobile viewports. | P3 |

---

## 7. User Experience Requirements

### 7.1 Design Language

KitabLLM uses a **Claymorphism** design system:

| Element | Specification |
|---|---|
| Background | Warm beige (`#f5f0eb`) in light mode; dark in dark mode |
| Cards | Frosted glass (`backdrop-filter: blur`), translucent borders |
| Shadows | Soft multi-layered: inset highlight + diffused outer |
| Accent Color | Lavender / purple (`#8b6cc7`) |
| Typography | Inter font family |
| Theme Toggle | Horizontal sliding clay-styled switch |
| Logo | Theme-adaptive (inverts in dark mode) |

### 7.2 Layout

```
┌──────────────────────────────────────────────────┐
│  Header (Logo + Theme Toggle + User Button)       │
├──────────┬────────────────────────┬───────────────┤
│          │                        │               │
│ Sidebar  │   Chat Interface       │ Source Viewer │
│ Notebook │   (Streaming + Cites)  │ (PDF/Web/VTT) │
│ List     │                        │               │
│          │   Source Panel         │               │
│          │   (Upload / List)      │               │
└──────────┴────────────────────────┴───────────────┘
```

### 7.3 Interaction Requirements

| Interaction | Expectation |
|---|---|
| Source upload | Progress bar shown during upload; spinner during indexing |
| Chat submit | Immediate streaming response begins; pipeline stage shown |
| Citation click | Source viewer opens and navigates to exact location |
| Notebook delete | Confirmation dialog before destruction |
| Error states | Toast notification with clear message and retry option |
| Loading states | Skeleton screens for notebook list and source list |

### 7.4 Accessibility

- Keyboard-navigable primary actions
- Sufficient color contrast ratios (WCAG AA)
- ARIA labels on icon-only buttons
- Focus indicators visible

---

## 8. Out of Scope

The following are explicitly **not** in scope for v0.1.0:

| Feature | Reason |
|---|---|
| Mobile app (iOS/Android) | Web-first; responsive mobile is a later milestone |
| Real-time collaboration / multi-user notebooks | Single-user architecture; sharing is v0.3.0+ |
| YouTube transcript on cloud hosting | Blocked by YouTube IP restrictions on data centers |
| BM25 / keyword hybrid search | Vector-only search is sufficient for v0.1.0 |
| S3 / CDN file storage | Local file storage adequate for self-hosted use case |
| Custom LLM fine-tuning | Uses standard OpenAI-compatible API |
| Analytics dashboard | Not a core research workflow feature |
| Billing / SaaS tier management | Open-source / self-hosted product |

---

## 9. Assumptions & Dependencies

### Assumptions

| # | Assumption |
|---|---|
| A1 | Users have access to an OpenAI-compatible API key (e.g., OpenAI, aicredits.in) |
| A2 | Users can provision a PostgreSQL database with pgvector (Neon free tier is sufficient) |
| A3 | PDFs are text-based (not image-only scans); OCR is not included |
| A4 | YouTube transcript fetching works only in local development (residential IP) |
| A5 | The primary deployment target is Render (cloud) or Docker (self-hosted) |

### External Dependencies

| Dependency | Purpose | Risk |
|---|---|---|
| Clerk | User authentication | Medium — third-party auth SaaS |
| Neon PostgreSQL | Managed database with pgvector | Low — standard PostgreSQL |
| OpenAI-compatible API | LLM inference + embeddings | Medium — API availability and cost |
| pgvector | Vector similarity search | Low — stable open-source extension |
| Vercel AI SDK | Streaming SSE responses | Low — well-maintained SDK |

---

## 10. Release Roadmap

### v0.1.0 — Foundation (Current)
> Core notebook, source management, RAG chat, citations, source viewer

- [x] Project setup (Next.js 16, Prisma, Clerk, Tailwind 4)
- [x] Authentication (sign-in / sign-up)
- [x] Notebook CRUD + dashboard
- [x] Source upload (PDF, Website, VTT, Text)
- [x] Async processing pipeline (extract → chunk → embed → store)
- [x] 10-stage RAG pipeline
- [x] Streaming chat with SSE
- [x] Citation generation + source viewer
- [x] Semantic search
- [x] Dark / light mode
- [x] Claymorphism UI

### v0.2.0 — Polish & Enhancement
> Reliability, performance, and quality-of-life improvements

- [ ] AI notebook summary (executive summary, flashcards, quiz)
- [ ] Follow-up question suggestions (post-response)
- [ ] Conversation history UI improvements
- [ ] Optimistic UI updates
- [ ] Virtual scrolling for large source lists
- [ ] Improved error recovery flows
- [ ] Accessibility audit pass

### v0.3.0 — Scale & Collaboration
> Multi-user features and cloud-grade storage

- [ ] Notebook sharing (read-only links)
- [ ] S3-compatible file storage
- [ ] BM25 hybrid search
- [ ] Bulk source import
- [ ] YouTube transcript support via residential proxy
- [ ] Export chat as Markdown / PDF
- [ ] Mobile-responsive layout

---

## 11. Open Questions

| # | Question | Owner | Status |
|---|---|---|---|
| Q1 | Should chunk size and overlap be user-configurable per notebook? | Product | Open |
| Q2 | What is the maximum file size allowed for PDF uploads? | Engineering | Open |
| Q3 | Should conversation history be limited (e.g., last 50 messages) to control context length? | Engineering | Open |
| Q4 | Is a free self-hosted tier the only model, or is there a future hosted SaaS plan? | Product | Open |
| Q5 | Should the AI summary feature support custom output formats (e.g., bullet points vs prose)? | Product | Open |
| Q6 | What OCR solution should be added for image-only PDFs? | Engineering | Backlog |

---

*Document generated: 2026-08-01 | Version: 0.1.0*
