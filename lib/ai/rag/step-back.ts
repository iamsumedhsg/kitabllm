import { openai, CHAT_MODEL } from "../llm";

/**
 * Generate a step-back question that provides broader context
 */
export async function generateStepBack(query: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      {
        role: "system",
        content: `You are an expert at generating step-back questions. Given a specific question, generate a broader, more general question that provides useful context for answering the original.

Rules:
- The step-back question should be more abstract/general
- It should help retrieve background context
- Return ONLY the step-back question, nothing else

Examples:
- "What is the temperature in Paris on Dec 25, 2023?" → "What is the typical climate and weather patterns in Paris during winter?"
- "How do I fix a NullPointerException in my UserService class?" → "What are common causes and patterns for handling null references in Java service classes?"`,
      },
      {
        role: "user",
        content: query,
      },
    ],
    temperature: 0.3,
    max_tokens: 200,
  });

  return response.choices[0]?.message?.content?.trim() || query;
}
