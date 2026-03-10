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

  STAGE 1 (always):
  → fetchCountryServices  — Streaming Availability /countries; used for chip options + platform ID resolution
  → guardRailCheck        — history-aware ALLOW/BLOCK classifier; always runs first; fails open

  STAGE 2 (IntentAgent — skipped when clarificationAnswers is present):
  → IntentAgent (claude-sonnet-4-6, 1024 tokens, maxIterations:2)
      └─ askClarification tool — if called → emit { type: "questions" }, halt; client re-POSTs with answers
      └─ "READY" output (no tool call) → proceed to Stage 3

  STAGE 3 (SearchAgent):
  → SearchAgent (claude-sonnet-4-6, 4096 tokens, maxIterations:5)
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
| `orchestrator.ts` | 3-stage supervisor: guardRailCheck → IntentAgent → SearchAgent; NDJSON emission |
| `intentAgent.ts` | `makeIntentAgent(country, services, year)` — AgentExecutor; decides clarify vs search |
| `searchAgent.ts` | `makeSearchAgent(country, services, year, answers)` — AgentExecutor; returns `SearchAgentHandle` |
| `llm.ts` | `getLLM()` (1024 tokens, IntentAgent) · `getAgentLLM()` (4096 tokens, SearchAgent) |
| `systemPrompt.ts` | `SYSTEM_PROMPT` · `buildAgentSystemPrompt()` · `buildIntentSystemPrompt()` |
| `utils.ts` | `extractJson()` — strips fences, finds outermost `{…}` block |
| `tools/guardRailCheck.ts` | History-aware ALLOW/BLOCK classifier — direct call; fails open |
| `tools/askClarification.ts` | Legacy pre-flight (kept for reference; no longer called by orchestrator) |
| `tools/askClarificationTool.ts` | LangChain tool used by IntentAgent to emit clarifying questions |
| `tools/searchContent.ts` | Streaming Availability `/shows/search/filters` HTTP call |
| `tools/checkAvailability.ts` | Sync formatter: prefer subscription/free, add-ons fill remaining slots, top 5 by rating |
| `tools/searchTool.ts` | `makeSearchTool(country, services)` — LangChain tool wrapping searchContent + checkAvailability |
| `tools/filterResults.ts` | `makeFilterTool(getResults)` — LangChain tool; agent passes only `criteria`; titles injected via closure |
| `tools/countryServices.ts` | Fetches streaming services list for a country from /countries |

**Prompt architecture:**

| Prompt | Location | Used by | Purpose |
|---|---|---|---|
| `SYSTEM_PROMPT` | `systemPrompt.ts` | base for `buildAgentSystemPrompt` | FlixScout identity, tone, rules |
| `buildIntentSystemPrompt()` | `systemPrompt.ts` | IntentAgent | Output "READY" or call askClarification |
| `buildAgentSystemPrompt()` | `systemPrompt.ts` | SearchAgent | FlixScout identity + search rules + tool instructions + year + services + answers |
| `CLASSIFIER_SYSTEM` | `guardRailCheck.ts` | `guardRailCheck` | Self-contained ALLOW/BLOCK classifier; explicitly allows refinement follow-ups |
| `FILTER_SYSTEM` | `filterResults.ts` | `filterResults` tool | Instructs LLM to select indices from provided title list |

**Platform resolution:**
- `/api/countries` proxies Streaming Availability `/countries`, returns `{ services: { id, name }[] }`, 24h cache
- `useCountryServices` hook (client) fetches and caches per country code
- `resolveToServiceIds` lives in `searchTool.ts`; resolves service names → IDs inside the tool
- Agent LLM extracts service names as-mentioned; tool matches to API `service.id`

**Clarification flow:**
- `clarificationAnswers === undefined` → first request, run IntentAgent; it may call `askClarification` tool (questions emitted, halt) or output "READY" (proceed)
- `clarificationAnswers` is any object (even `{}`) → user submitted chips, skip IntentAgent, go straight to SearchAgent
- Submitting with no selections is valid and proceeds to search
- Clarification answers are appended to the human input message for the SearchAgent

**checkAvailability sorting:**
- Subscription/free titles sorted first by IMDb rating
- Add-on titles fill remaining slots (only appear if fewer than 5 subscription/free results)
- Rent/buy options are never surfaced

**filterResults behaviour:**
- SearchAgent calls it only when user specifies criteria the API cannot handle (mood, tone, age, sensitivity)
- Agent passes only a `criteria` string — titles are injected via `getResults()` closure from `SearchAgentHandle.pendingCards`
- Inner LLM evaluates each title's overview + genres and returns selected indices — cannot add titles not in the list
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
6e. ✅ Multi-agent refactor — IntentAgent + SearchAgent; history-aware guardrail
7. ✅ Session persistence
8. Guardrail tests
9. Vercel deployment config + README
