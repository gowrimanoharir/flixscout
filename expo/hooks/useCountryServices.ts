// Fetches available streaming services for a given country from the BFF /api/countries endpoint.
// Module-level cache so each country is only fetched once per app session.

import { useState, useEffect } from 'react';

export interface PlatformOption {
  id: string;   // API slug e.g. "netflix"
  name: string; // Display label e.g. "Netflix"
}

const cache = new Map<string, PlatformOption[]>();

export function useCountryServices(countryCode: string): {
  services: PlatformOption[];
  loading: boolean;
} {
  const key = countryCode.toLowerCase();
  const [services, setServices] = useState<PlatformOption[]>(cache.get(key) ?? []);
  const [loading, setLoading] = useState(!cache.has(key));

  useEffect(() => {
    if (cache.has(key)) return;

    let cancelled = false;
    setLoading(true);

    fetch(`/api/countries?country=${key}`)
      .then((r) => r.json())
      .then((data: { services?: PlatformOption[] }) => {
        if (cancelled) return;
        const list = Array.isArray(data.services) ? data.services : [];
        cache.set(key, list);
        setServices(list);
      })
      .catch(() => { /* leave services empty on error */ })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [key]);

  return { services, loading };
}
