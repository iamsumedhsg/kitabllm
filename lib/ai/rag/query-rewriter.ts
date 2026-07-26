import { openai, CHAT_MODEL } from "../llm";

/**
 * Rewrite query to fix spelling, resolve ambiguity, remove redundancy
 */
export async function rewriteQuery(query: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      {
        role: "system",
        content: `You are a query rewriting expert. Improve the user's search query by:
1. Fixing any spelling mistakes
2. Resolving ambiguity
3. Removing redundancy
4. Making it more precise and searchable
5. Keeping the original intent intact

Return ONLY the rewritten query, nothing else. If the query is already clear and well-formed, return it unchanged.`,
      },
      {
        role: "user",
        content: query,
      },
    ],
    temperature: 0.2,
    max_tokens: 200,
  });

  return response.choices[0]?.message?.content?.trim() || query;
}
