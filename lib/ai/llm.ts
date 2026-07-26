import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.AI_API_KEY,
  baseURL: process.env.AI_BASE_URL,
});

export const CHAT_MODEL = process.env.CHAT_MODEL || "gpt-4.1";
export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small";
