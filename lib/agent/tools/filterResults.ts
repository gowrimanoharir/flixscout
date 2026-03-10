// LLM-based post-filter for results returned by findAvailableContent.
// Only called when the user's request includes filtering criteria the API cannot express
// (e.g. content rating, emotional tone, age-appropriateness, mood, maturity level).
// The LLM evaluates each title using only the data returned by the API — it cannot add titles.

import { z } from 'zod';
import { tool } from '@langchain/core/tools';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { getLLM } from '../llm';
import { extractJson } from '../utils';
import type { AvailableTitle } from '../../../shared/types';

const filterResultsInner = z.object({
  results: z.string().describe(
    'JSON array of AvailableTitle objects exactly as returned by findAvailableContent'
  ),
  criteria: z.string().describe(
    'The user-defined filtering criteria that the search API could not express ' +
    '(e.g. "not scary", "appropriate for a 5-year-old", "dark and mature tone", ' +
    '"uplifting mood", "suitable for teens", "emotionally heavy")'
  ),
});

// LLMs sometimes wrap tool args as { input: "{...}" } instead of passing fields directly.
// Preprocess unwraps that pattern before Zod validates.
const filterResultsSchema = z.preprocess(
  (v: unknown) => {
    if (v && typeof v === 'object' && 'input' in v && typeof (v as Record<string, unknown>).input === 'string') {
      try { return JSON.parse((v as Record<string, unknown>).input as string); } catch {}
    }
    return v;
  },
  filterResultsInner
);

const FILTER_SYSTEM = `You are a content screener. You will receive a list of movies/TV shows with their title, year, genres, and overview, plus a filtering criteria. Select which titles match the criteria based ONLY on the provided information.

Return ONLY valid JSON — no markdown, no extra text:
{"selected": [1, 2, 3]}

Rules:
- Indices are 1-based, matching the numbered list
- Order selected indices by best fit first
- Only exclude a title if it clearly does NOT match the criteria based on its overview or genres
- If a title's overview is missing or ambiguous, include it (do not exclude on uncertainty)
- Never introduce or infer titles that were not in the input list`;

export function makeFilterTool() {
  return tool(
    async (input) => {
      let titles: AvailableTitle[];
      try {
        titles = JSON.parse(input.results) as AvailableTitle[];
      } catch {
        return input.results;
      }

      if (!titles.length) return input.results;

      const llm = getLLM();

      const titlesDescription = titles
        .map(
          (t, i) =>
            `${i + 1}. "${t.title}" (${t.year}, genres: ${t.genre ?? 'unknown'}) — ${
              (t.overview ?? '').slice(0, 250)
            }`
        )
        .join('\n');

      const response = await llm.invoke([
        new SystemMessage(FILTER_SYSTEM),
        new HumanMessage(`Criteria: ${input.criteria}\n\nTitles:\n${titlesDescription}`),
      ]);

      let parsed: { selected?: unknown };
      try {
        parsed = JSON.parse(extractJson(response.content));
      } catch {
        return input.results;
      }

      const indices = Array.isArray(parsed.selected) ? (parsed.selected as number[]) : [];
      const selected = indices
        .filter((i) => typeof i === 'number' && i >= 1 && i <= titles.length)
        .map((i) => titles[i - 1]);

      // Fall back to original list if filter removed everything
      return JSON.stringify(selected.length > 0 ? selected : titles);
    },
    {
      name: 'filterResults',
      description:
        'Filter and reorder titles (from findAvailableContent) using criteria the search API cannot express — ' +
        'such as content rating, emotional tone, mood, age-appropriateness, maturity level, or sensitivity. ' +
        'Call this ONLY when the user specifies filtering that cannot be covered by genres, language, year, rating, or platform. ' +
        'Always call findAvailableContent first, then pass its raw output directly into this tool. ' +
        'This tool only selects from the provided list — it never invents or adds titles.',
      schema: filterResultsSchema,
    }
  );
}
