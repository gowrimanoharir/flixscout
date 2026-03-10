// Extracts the first JSON object from an LLM response string.
// Handles markdown code fences and prose wrapping around the JSON object.
export function extractJson(raw: unknown): string {
  const text = typeof raw === 'string' ? raw : JSON.stringify(raw);

  // Strip markdown fences if present
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();

  // Extract the outermost {...} block in case the LLM added prose around the JSON
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) return braceMatch[0];

  return text.trim();
}
