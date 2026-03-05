// Fetches the list of streaming services available in a given country
// from the Streaming Availability API /countries endpoint.
// Used by askClarification to populate real platform options.

export interface ServiceOption {
  id: string;   // API slug e.g. "netflix"
  name: string; // Display label e.g. "Netflix"
}

interface CountryEntry {
  services: Record<string, { id: string; name: string }>;
}

export async function fetchCountryServices(country: string): Promise<ServiceOption[]> {
  const apiKey = process.env.STREAMING_API_KEY;
  if (!apiKey) throw new Error('STREAMING_API_KEY is required');

  const base = process.env.STREAMING_API_BASE;
  if (!base) throw new Error('STREAMING_API_BASE is required');

  const host = new URL(base).hostname;
  const url = `${base.replace(/\/$/, '')}/countries`;

  const res = await fetch(url, {
    headers: {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': host,
    },
  });

  if (!res.ok) {
    console.warn('[Countries] fetch failed:', res.status);
    return [];
  }

  const data = await res.json() as Record<string, CountryEntry>;
  const entry = data[country.toLowerCase()];
  if (!entry) return [];

  return Object.values(entry.services).map((s) => ({ id: s.id, name: s.name }));
}
