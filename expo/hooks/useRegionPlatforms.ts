// TODO: Phase 6 — Country detection via Intl.DateTimeFormat timezone
// Returns platform list for detected country
// Supported regions: CA, US, GB, AU, IN, DE, FR, XX (fallback)
// Platform data sourced from flixscout-final.html PLATFORMS map

export type CountryCode = 'CA' | 'US' | 'GB' | 'AU' | 'IN' | 'DE' | 'FR' | 'XX';

export interface RegionPlatforms {
  countryCode: CountryCode;
  flag: string;
  label: string;
  platforms: string[];
}

export function useRegionPlatforms(): RegionPlatforms {
  return {
    countryCode: 'XX',
    flag: '🌍',
    label: 'your region',
    platforms: ['Netflix', 'Prime Video', 'Disney+', 'Apple TV+', 'MUBI'],
  };
}
