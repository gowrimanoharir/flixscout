// BFF endpoint — GET /api/countries?country=ca
// Proxies the Streaming Availability /countries endpoint and returns the
// list of services available in the requested country as { id, name }[].

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ServiceEntry {
  id: string;
  name: string;
}

interface CountryEntry {
  services: Record<string, { id: string; name: string }>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const country = (req.query.country as string | undefined)?.toLowerCase();
  if (!country) {
    return res.status(400).json({ error: 'country query param is required' });
  }

  const apiKey = process.env.STREAMING_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'STREAMING_API_KEY not configured' });

  const base = process.env.STREAMING_API_BASE;
  if (!base) return res.status(500).json({ error: 'STREAMING_API_BASE not configured' });

  const host = new URL(base).hostname;
  const url = `${base.replace(/\/$/, '')}/countries`;

  const upstream = await fetch(url, {
    headers: {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': host,
    },
  });

  if (!upstream.ok) {
    return res.status(upstream.status).json({ error: `Upstream error: ${upstream.status}` });
  }

  const data = await upstream.json() as Record<string, CountryEntry>;

  const entry = data[country];
  if (!entry) {
    return res.status(404).json({ error: `Country "${country}" not found` });
  }

  const services: ServiceEntry[] = Object.values(entry.services).map((s) => ({
    id: s.id,
    name: s.name,
  }));

  res.setHeader('Cache-Control', 'public, max-age=86400'); // cache 24h — services rarely change
  return res.status(200).json({ services });
}
