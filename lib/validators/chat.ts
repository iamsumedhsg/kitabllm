import { z } from "zod";

export const chatMessageSchema = z.object({
  notebookId: z.string().cuid(),
  conversationId: z.string().cuid().optional(),
  message: z.string().min(1, "Message cannot be empty").max(10000),
});

export const chatHistorySchema = z.object({
  conversationId: z.string().cuid(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type ChatHistoryInput = z.infer<typeof chatHistorySchema>;
