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
| `agent/` | LangChain tools + system prompt, imported by the BFF |

**Request flow:**

```
Expo app → POST /api/agent { message, history }
  → GuardRailCheck (blocks NSFW/off-topic — no API calls)
  → AskClarification (streams chip questions, waits for user)
  → SearchContent (OMDb) + CheckAvailability (RapidAPI) in parallel
  → streams { type: "cards"|"message"|"questions", payload } back
```

The client **never** calls OMDb or RapidAPI directly. All keys are server-side only.

**The four agent tools** (`agent/tools/`):
- `guardRailCheck` — keyword blocklist + Claude semantic check, returns `{ allowed, reason? }`
- `askClarification` — 1–5 questions, returns `{ questions: [{ question, options[] }] }`
- `searchContent` — OMDb `?s=` keyword search, always `include_adult=false`, returns top 10 with `imdbId`
- `checkAvailability` — RapidAPI Streaming Availability, filters unavailable titles out entirely

**Guardrail rule:** Agent may only surface titles returned by `checkAvailability`. Zero hallucination.

## Design

Primary reference: `flixscout-final.html` (read this file for all component structure + interaction states).

**Gradient rule — non-negotiable:**
- Light `#93C5FD → #C4B5FD` → text/outline context only (logo, selected chip borders)
- Dark `#1E3A8A → #4C1D95` → filled button surfaces only (send button, continue button)
- Never mix both on the same or adjacent elements

Design tokens live in `expo/theme/colors.ts` and `expo/theme/fonts.ts`.

**Five screen states** (all prototyped in `flixscout-final.html`): empty, clarification, loading, results, no-results.

## Environment Variables

All six are required — the app throws on startup if any are missing.

```
LLM_API_KEY          # LLM API key
CONTENT_API_KEY      # Content search API key
CONTENT_API_BASE     # Content search API base URL (e.g. https://www.omdbapi.com)
STREAMING_API_KEY    # Streaming availability API key
STREAMING_API_BASE   # Streaming availability API base URL (e.g. https://streaming-availability.p.rapidapi.com)
```

Note: the streaming API host header is derived automatically from `STREAMING_API_BASE` — no separate var needed.

## Workflow

Always run a sub-agent code review before any `git commit` or `git push`. The review agent should check for TypeScript correctness, logic errors, API integration issues, and consistency across changed files. Apply any critical/high fixes before committing. Skip style suggestions and TODOs deferred to later phases.

## Build Phases

Build phases in order — do not skip ahead without confirmation:

1. **Project scaffold** ← current
2. Design tokens extraction
3. BFF API route + LangChain setup
4. Agent tools (one at a time)
5. System prompt
6. Chat UI + all components
7. Session persistence
8. Guardrail tests
9. Vercel deployment config
