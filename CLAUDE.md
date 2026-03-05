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

**Three layers, one repo:**

| Folder | What it is |
|---|---|
| `expo/` | React Native + Expo app (Expo Router, RN Reanimated) |
| `api/agent/` | Single Vercel serverless function — the BFF |
| `api/countries.ts` | BFF endpoint proxying `/countries` from Streaming Availability API |

**Request flow:**

```
Expo app → POST /api/agent { message, clarificationAnswers?, country? }
  → fetchCountryServices (Streaming Availability /countries — for clarification chips + platform slug resolution)
  → GuardRailCheck (Claude semantic classifier — blocks NSFW/off-topic)
  → AskClarification (skipped if clarificationAnswers is present, even if empty)
  → buildSearchFilters (Claude intent extraction — returns structured JSON, never conversational)
  → SearchContent (Streaming Availability /shows/search/filters)
  → CheckAvailability (sync formatter — filters by subscription/free, labels add-ons, top 5 by rating)
  → streams { type: "cards"|"message"|"questions"|"status"|"error", payload } back
```

The client **never** calls the Streaming Availability API directly. All keys are server-side only.

**The four agent tools** (`api/agent/tools/`):
- `guardRailCheck` — Claude semantic ALLOW/BLOCK classifier with its own `CLASSIFIER_SYSTEM` prompt
- `askClarification` — uses `SYSTEM_PROMPT` + clarification rules; returns `{ questions: [] }` for specific title lookups ("where can I watch X")
- `searchContent` — calls Streaming Availability `/shows/search/filters`; sends keyword only when no genres present; skips keyword when language+year fully describe the request
- `checkAvailability` — sync formatter; prefers `subscription`/`free` streaming options; falls back to `addon` labelled as "Service (add-on)"; post-filters by runtime; sorts by rating; returns top 5

**Prompt architecture:**
- `SYSTEM_PROMPT` — FlixScout identity, rules, tone. Used in `askClarification` only.
- `INTENT_EXTRACTION_PROMPT` — standalone JSON extractor, no persona, no questions. Used in `buildSearchFilters` only. Injects `new Date().getFullYear()` for relative date expressions.
- `CLASSIFIER_SYSTEM` (in `guardRailCheck`) — dedicated ALLOW/BLOCK prompt, self-contained.

**Platform resolution:**
- `/api/countries` proxies Streaming Availability `/countries`, returns `{ services: { id, name }[] }`, 24h cache
- `useCountryServices` hook (client) fetches and caches per country code
- Orchestrator resolves service names → IDs using `resolveToServiceIds` before sending `catalogs` param
- LLM extracts service names as-mentioned; orchestrator matches to API `service.id`

**Clarification flow:**
- `clarificationAnswers === undefined` → first request, run `askClarification`
- `clarificationAnswers` is any object (even `{}`) → user submitted chips, skip to search
- Submitting with no selections is valid and proceeds to search

**Guardrail rule:** Agent may only surface titles returned by `checkAvailability`. Zero hallucination.

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
7. Session persistence
8. Guardrail tests
9. Vercel deployment config + README
