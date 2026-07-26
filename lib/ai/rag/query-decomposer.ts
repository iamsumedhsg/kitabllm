import { openai, CHAT_MODEL } from "../llm";

/**
 * Decompose a complex query into atomic sub-queries
 */
export async function decomposeQuery(query: string): Promise<string[]> {
  const response = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      {
        role: "system",
        content: `You are a query decomposition expert. Break down the user's question into 2-4 atomic sub-questions that, when answered together, fully address the original question.

Rules:
- Each sub-question should be self-contained and searchable
- Keep the questions specific and focused
- If the query is already atomic, return it as-is
- Return ONLY a JSON array of strings, nothing else

Example:
Input: "What are the main differences between React and Vue in terms of state management and performance?"
Output: ["What is React's approach to state management?", "What is Vue's approach to state management?", "How does React perform compared to Vue?", "What are the key architectural differences between React and Vue?"]`,
      },
      {
        role: "user",
        content: query,
      },
    ],
    temperature: 0.3,
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) return [query];

  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [query];
  } catch {
    return [query];
  }
}
