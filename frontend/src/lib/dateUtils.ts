
const INDIA_TIME_ZONE = 'Asia/Kolkata';

function parseMindEaseTimestamp(
  value: string | Date | null | undefined
): Date | null {
  if (value == null) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = value.trim();

  if (!raw) {
    return null;
  }

  // Normalize PostgreSQL's "YYYY-MM-DD HH:mm:ss" format.
  const normalized = raw.includes('T')
    ? raw
    : raw.replace(' ', 'T');

  // Preserve an existing UTC marker or explicit timezone offset.
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);

  // Legacy timestamp-without-timezone values are interpreted as UTC.
  const date = new Date(
    hasTimezone ? normalized : `${normalized}Z`
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatMindEaseTimestamp(
  value: string | Date | null | undefined
): string {
  const date = parseMindEaseTimestamp(value);

  if (!date) {
    return 'Unknown time';
  }

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: INDIA_TIME_ZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function formatMindEaseDate(
  value: string | Date | null | undefined
): string {
  const date = parseMindEaseTimestamp(value);

  if (!date) {
    return 'Unknown date';
  }

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: INDIA_TIME_ZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatMindEaseTime(
  value: string | Date | null | undefined
): string {
  const date = parseMindEaseTimestamp(value);

  if (!date) {
    return 'Unknown time';
  }

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: INDIA_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function getMindEaseDateKey(
  value: string | Date | null | undefined
): string {
  const date = parseMindEaseTimestamp(value);

  if (!date) {
    return 'unknown';
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: INDIA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    return 'unknown';
  }

  return `${year}-${month}-${day}`;
}
