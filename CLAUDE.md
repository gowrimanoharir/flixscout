# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start              # Expo dev server (all platforms)
npm run web            # Expo dev server (web only)
npm run build:web      # Static export → dist/
npm run lint           # tsc --noEmit (TypeScript check only)
npm test               # jest
```

## Architecture

**Four layers, one repo:**

| Folder | What it is |
|---|---|
| `expo/` | React Native + Expo app (Expo Router, RN Reanimated) |
| `api/agent/index.ts` | Vercel serverless function entry point — `/api/agent` |
| `api/countries.ts` | Vercel serverless function — `/api/countries` (proxies Streaming Availability) |
| `lib/agent/` | All BFF implementation (orchestrator, LLM, tools, prompts) — not a Vercel function |

> Vercel Hobby plan allows max 12 serverless functions. Only files directly in `api/` are endpoints; `lib/` is bundled implementation code.

**Request flow:**

```
Expo app → POST /api/agent { message, clarificationAnswers?, history?, country? }

  PRE-FLIGHT (hand-rolled, deterministic):
  → fetchCountryServices  — Streaming Availability /countries; used for chip options + platform ID resolution
  → guardRailCheck        — Claude ALLOW/BLOCK classifier; always runs first
  → askClarification      — skipped when clarificationAnswers is present (even {})
      └─ if questions returned → emit { type: "questions" }, halt; client re-POSTs with answers

  AGENT PHASE (LangChain AgentExecutor + createToolCallingAgent):
  → AgentExecutor (claude-sonnet-4-6, 4096 tokens)
      ├─ findAvailableContent  — always called once; all platforms combined in one call
      │     └─ searchContent (Streaming Availability /shows/search/filters)
      │     └─ checkAvailability (sync formatter — subscription/free first, add-ons fill remaining slots, top 5)
      └─ filterResults         — called only when user criteria cannot be expressed as API params
            └─ (mood, tone, age-appropriateness, sensitivity, maturity level — no G/PG filter in API)
            └─ LLM selects from returned titles only; never adds new titles

  → streams NDJSON lines: { type: "cards"|"message"|"questions"|"status"|"error", payload }
```

The client **never** calls the Streaming Availability API directly. All keys are server-side only.

**API endpoints** (`api/`):

| File | Role |
|---|---|
| `api/agent/index.ts` | HTTP handler — parse/validate request, set NDJSON headers, call `runOrchestrator` |
| `api/countries.ts` | Proxy `/api/countries?country=ca` → Streaming Availability `/countries`, 24h cache |

**BFF implementation** (`lib/agent/`):

| File | Role |
|---|---|
| `orchestrator.ts` | Pre-flight gates + AgentExecutor wiring; NDJSON emission |
| `llm.ts` | `getLLM()` (1024 tokens, pre-flight) · `getAgentLLM()` (4096 tokens, agent phase) |
| `systemPrompt.ts` | `SYSTEM_PROMPT` · `INTENT_EXTRACTION_PROMPT` · `buildAgentSystemPrompt()` |
| `utils.ts` | `extractJson()` — strips fences, finds outermost `{…}` block |
| `tools/guardRailCheck.ts` | Claude ALLOW/BLOCK classifier — direct call, not an agent tool |
| `tools/askClarification.ts` | Generates clarification chips — direct call, not an agent tool |
| `tools/searchContent.ts` | Streaming Availability `/shows/search/filters` HTTP call |
| `tools/checkAvailability.ts` | Sync formatter: prefer subscription/free, add-ons fill remaining slots, top 5 by rating |
| `tools/searchTool.ts` | `makeSearchTool(country, services)` — LangChain `DynamicStructuredTool` wrapping searchContent + checkAvailability; agent fills search params directly |
| `tools/filterResults.ts` | `makeFilterTool()` — LangChain tool; LLM post-filters API-returned titles by tone/mood/age; only called when API params are insufficient |
| `tools/countryServices.ts` | Fetches streaming services list for a country from /countries |

**Prompt architecture:**

| Prompt | Location | Used by | Purpose |
|---|---|---|---|
| `SYSTEM_PROMPT` | `systemPrompt.ts` | `askClarification` | FlixScout identity, tone, rules |
| `INTENT_EXTRACTION_PROMPT` | `systemPrompt.ts` | _(reference only — agent LLM replaces this)_ | Legacy standalone JSON extractor |
| `buildAgentSystemPrompt()` | `systemPrompt.ts` | `orchestrator` → AgentExecutor | FlixScout identity + search rules + tool usage instructions + current year + services + clarification answers |
| `CLASSIFIER_SYSTEM` | `guardRailCheck.ts` | `guardRailCheck` | Self-contained ALLOW/BLOCK classifier |
| `FILTER_SYSTEM` | `filterResults.ts` | `filterResults` tool | Instructs LLM to select indices from provided title list |

**Platform resolution:**
- `/api/countries` proxies Streaming Availability `/countries`, returns `{ services: { id, name }[] }`, 24h cache
- `useCountryServices` hook (client) fetches and caches per country code
- `resolveToServiceIds` lives in `searchTool.ts`; resolves service names → IDs inside the tool
- Agent LLM extracts service names as-mentioned; tool matches to API `service.id`

**Clarification flow:**
- `clarificationAnswers === undefined` → first request, run `askClarification`
- `clarificationAnswers` is any object (even `{}`) → user submitted chips, skip to search
- Submitting with no selections is valid and proceeds to search
- Clarification answers are appended to the human input message for the AgentExecutor

**checkAvailability sorting:**
- Subscription/free titles sorted first by IMDb rating
- Add-on titles fill remaining slots (only appear if fewer than 5 subscription/free results)
- Rent/buy options are never surfaced

**filterResults behaviour:**
- Agent calls it only when user specifies criteria the API cannot handle (mood, tone, age, sensitivity)
- LLM evaluates each title's overview + genres — cannot add titles not in the input list
- Falls back to full list if filter would remove everything

**Guardrail rule:** Agent may only surface titles returned by `checkAvailability` / `filterResults`. Zero hallucination.

## Design

Primary reference: `flixscout-final.html` at `C:\Users\JJr\Documents\OverclockAccel\Homeworks\flixscout\flixscout-final.html` (outside the project repo).

**Gradient rule — non-negotiable:**
- Light `#93C5FD → #C4B5FD` → text/outline context only (logo, selected chip borders)
- Dark `#1E3A8A → #4C1D95` → filled button surfaces only (send button, continue button)
- Never mix both on the same or adjacent elements

Design tokens live in `expo/theme/colors.ts` and `expo/theme/fonts.ts`.

**Five screen states** (all prototyped in `flixscout-final.html`): empty, clarification, loading, results, no-results.

**Starfield background:** `expo/components/StarfieldBackground.tsx` — 90 seeded-deterministic twinkling dots, Reanimated, absoluteFill behind all content.

## Environment Variables

Three are required:

```
LLM_API_KEY          # Anthropic API key
STREAMING_API_KEY    # Streaming Availability RapidAPI key
STREAMING_API_BASE   # e.g. https://streaming-availability.p.rapidapi.com
```

Note: the streaming API host header is derived automatically from `STREAMING_API_BASE` — no separate var needed.

## Workflow

Always run a sub-agent code review before any `git commit` or `git push`. The review agent should check for TypeScript correctness, logic errors, API integration issues, and consistency across changed files. Apply any critical/high fixes before committing. Skip style suggestions and TODOs deferred to later phases.

## Build Phases

Build phases in order — do not skip ahead without confirmation:

1. ✅ Project scaffold
2. ✅ Design tokens extraction
3. ✅ BFF API route + LangChain setup
4. ✅ Agent tools
5. ✅ System prompt
6a. ✅ Deps + fonts + screen shell + empty state
6b. ✅ Input + useAgent streaming hook + real LLM (guardrail blocked message + clarification chips)
6c. ✅ Search + availability APIs connected — RecommendationCard + no-results + loading shimmer
6d. ✅ LangChain AgentExecutor refactor + filterResults tool
7. Session persistence
8. Guardrail tests
9. Vercel deployment config + README
