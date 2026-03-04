// TODO: Phase 3 — LangChain BFF agent
// Accepts POST { message: string, history: Message[] }
// Orchestration: GuardRailCheck → AskClarification → SearchContent + CheckAvailability (parallel)
// Returns streaming JSON: { type: "cards" | "message" | "questions", payload: ... }

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).json({ message: 'FlixScout API — Phase 3 pending' });
}
