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

// Only criteria — results are injected via closure from orchestrator's pendingCards.
// This prevents the LLM from having to copy-paste a large JSON blob between tools.
const filterResultsSchema = z.object({
  criteria: z.string().describe(
    'Plain-language description of what to keep or remove — e.g. "not scary", ' +
    '"appropriate for a 5-year-old", "uplifting mood", "suitable for teens", ' +
    '"dark and mature", "emotionally heavy"'
  ),
});

const FILTER_SYSTEM = `You are a content screener. You will receive a list of movies/TV shows with their title, year, genres, and overview, plus a filtering criteria. Select which titles match the criteria based ONLY on the provided information.

Return ONLY valid JSON — no markdown, no extra text:
{"selected": [1, 2, 3]}

Rules:
- Indices are 1-based, matching the numbered list
- Order selected indices by best fit first
- Default: include a title only if its overview, genres, or title provide positive evidence it matches the criteria. The type-specific rules below override this default.
- Setting/location criteria — words describing a physical place or environment (e.g. "tropical", "beach", "set in France", "rural", "outer space"): include only if the overview explicitly mentions or strongly implies that setting. If the overview is missing or empty, include the title (cannot exclude on missing data for location).
- Mood/tone/age criteria — words describing emotional quality, atmosphere, or suitability (e.g. "uplifting", "not scary", "for children", "cozy", "dark", "intense"): include unless the overview clearly contradicts it. If the overview is missing or empty, include if genres are broadly consistent.
- Compound criteria: identify each term as a setting/location word or a mood/tone word using the definitions above, then apply the matching rule to each term. A title must satisfy all terms to be included.
- Never introduce or infer titles that were not in the input list`;

export function makeFilterTool(getResults: () => AvailableTitle[]) {
  return tool(
    async (input) => {
      const titles = getResults();

      if (!titles.length) return JSON.stringify([]);

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
        return JSON.stringify(titles);
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
        'Filter and reorder the results already returned by findAvailableContent, using criteria the search API cannot express — ' +
        'such as emotional tone, mood, age-appropriateness, maturity level, or sensitivity. ' +
        'Call this ONLY when the user specifies filtering that cannot be covered by genres, language, year, rating, or platform. ' +
        'Always call findAvailableContent first. Only pass a concise criteria string — do NOT pass the results list.',
      schema: filterResultsSchema,
    }
  );
}
