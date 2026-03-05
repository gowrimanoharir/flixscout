import { useMemo } from 'react';

export type CountryCode = 'CA' | 'US' | 'GB' | 'AU' | 'IN' | 'DE' | 'FR' | 'XX';

const FLAGS: Record<CountryCode, string> = {
  US: '🇺🇸', CA: '🇨🇦', GB: '🇬🇧', AU: '🇦🇺',
  IN: '🇮🇳', DE: '🇩🇪', FR: '🇫🇷', XX: '🌍',
};

const LABELS: Record<CountryCode, string> = {
  US: 'United States', CA: 'Canada', GB: 'United Kingdom',
  AU: 'Australia', IN: 'India', DE: 'Germany', FR: 'France', XX: 'Unknown',
};

// CA-specific timezones — everything else in America/ is treated as US
const CA_ZONES = new Set([
  'America/Toronto', 'America/Vancouver', 'America/Edmonton',
  'America/Winnipeg', 'America/Halifax', 'America/St_Johns',
  'America/Regina', 'America/Whitehorse', 'America/Yellowknife',
]);

function detectCountry(): CountryCode {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz.startsWith('America/')) return CA_ZONES.has(tz) ? 'CA' : 'US';
    if (tz === 'Europe/London') return 'GB';
    if (tz.startsWith('Australia/')) return 'AU';
    if (tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta') return 'IN';
    if (tz === 'Europe/Berlin') return 'DE';
    if (tz === 'Europe/Paris') return 'FR';
  } catch { /* fallthrough */ }
  return 'XX';
}

export interface RegionPlatforms {
  countryCode: CountryCode;
  flag: string;
  label: string;
}

export function useRegionPlatforms(): RegionPlatforms {
  return useMemo(() => {
    const code = detectCountry();
    return { countryCode: code, flag: FLAGS[code], label: LABELS[code] };
  }, []);
}
