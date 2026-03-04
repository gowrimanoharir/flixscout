// Extracts the first JSON object from an LLM response string.
// Handles markdown code fences (```json ... ```) that models sometimes emit
// despite being told not to.
export function extractJson(raw: unknown): string {
  const text = typeof raw === 'string' ? raw : JSON.stringify(raw);

  // Strip markdown fences if present
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();

  // Otherwise return the trimmed text as-is
  return text.trim();
}
