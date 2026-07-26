import { z } from "zod";

export const sourceTypeSchema = z.enum(["PDF", "TEXT", "WEBSITE", "YOUTUBE", "VTT"]);

export const uploadSourceSchema = z.object({
  notebookId: z.string().cuid(),
  type: sourceTypeSchema,
  filename: z.string().min(1),
  url: z.string().url().optional(),
});

export const urlSourceSchema = z.object({
  notebookId: z.string().cuid(),
  type: z.enum(["WEBSITE", "YOUTUBE"]),
  url: z.string().url("Please provide a valid URL"),
  filename: z.string().min(1).optional(),
});

export type UploadSourceInput = z.infer<typeof uploadSourceSchema>;
export type UrlSourceInput = z.infer<typeof urlSourceSchema>;
