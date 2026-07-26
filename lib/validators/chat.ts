import { z } from "zod";

export const chatMessageSchema = z.object({
  notebookId: z.string().min(1),
  conversationId: z.string().min(1).nullish(), // allows null, undefined, or valid string
  message: z.string().min(1, "Message cannot be empty").max(10000),
});

export const chatHistorySchema = z.object({
  conversationId: z.string().min(1),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type ChatHistoryInput = z.infer<typeof chatHistorySchema>;
