import { openai, CHAT_MODEL } from "../llm";

/**
 * Generate a Hypothetical Document Embedding (HyDE)
 * Creates a hypothetical answer that would be found in the knowledge base
 */
export async function generateHyDE(query: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      {
        role: "system",
        content: `You are a document generator. Given a question, write a short paragraph (100-200 words) that would be the ideal passage in a document that answers this question. 

Rules:
- Write as if you are the relevant document/textbook/article
- Be factual and specific
- Use the kind of language that would appear in a reference document
- Return ONLY the hypothetical document passage, nothing else`,
      },
      {
        role: "user",
        content: query,
      },
    ],
    temperature: 0.5,
    max_tokens: 300,
  });

  return response.choices[0]?.message?.content?.trim() || query;
}
