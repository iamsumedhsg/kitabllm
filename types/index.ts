// Shared TypeScript types for KitabLLM

export type SourceType = "PDF" | "TEXT" | "WEBSITE" | "YOUTUBE" | "VTT";
export type SourceStatus = "UPLOADING" | "INDEXING" | "READY" | "FAILED" | "REMOVING";
export type MessageRole = "USER" | "ASSISTANT" | "SYSTEM";

export interface Notebook {
  id: string;
  title: string;
  description: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    sources: number;
    conversations: number;
  };
}

export interface Source {
  id: string;
  notebookId: string;
  filename: string;
  type: SourceType;
  size: number;
  url: string | null;
  filePath: string | null;
  status: SourceStatus;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    chunks: number;
  };
}

export interface Chunk {
  id: string;
  sourceId: string;
  content: string;
  chunkNumber: number;
  pageNumber: number | null;
  timestamp: string | null;
  title: string | null;
  url: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  notebookId: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  messages?: Message[];
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  citations?: Citation[];
  createdAt: Date;
}

export interface Citation {
  id: string;
  messageId: string;
  sourceId: string;
  chunkId: string;
  pageNumber: number | null;
  timestamp: string | null;
  confidence: number | null;
  excerpt: string | null;
  source?: Source;
  chunk?: Chunk;
}

// RAG Pipeline Types
export interface QueryDecomposition {
  originalQuery: string;
  subQueries: string[];
  stepBackQuery: string;
  rewrittenQuery: string;
  hydeDocument: string;
}

export interface RetrievedChunk {
  chunk: Chunk;
  score: number;
  source: Source;
}

export interface ChunkGroup {
  chunks: RetrievedChunk[];
  sourceId: string;
  sourceName: string;
  avgScore: number;
  rrfScore: number;
}

export interface RAGContext {
  query: string;
  decomposition: QueryDecomposition;
  groups: ChunkGroup[];
  citations: Citation[];
}

// Pipeline state
export type PipelineStage =
  | "IDLE"
  | "DECOMPOSING"
  | "RETRIEVING"
  | "RANKING"
  | "GENERATING"
  | "STREAMING"
  | "REFINING"
  | "COMPLETE"
  | "ERROR";

export interface PipelineState {
  stage: PipelineStage;
  progress: number;
  error?: string;
}
