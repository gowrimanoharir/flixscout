// Vercel serverless function — entry point at /api/agent
// HTTP layer only: parse, validate, set up NDJSON stream, delegate to orchestrator

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runOrchestrator } from '../../lib/agent/orchestrator';
import type { AgentRequestBody } from '../../shared/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body as AgentRequestBody;

  if (!body?.message || typeof body.message !== 'string' || !body.message.trim()) {
    return res.status(400).json({ error: 'message is required and must be a non-empty string' });
  }

  res.setHeader('Content-Type', 'application/x-ndjson');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  await runOrchestrator(body, res);

  return res.end();
}
