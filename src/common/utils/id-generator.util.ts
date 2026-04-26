/**
 * Human-readable prefixed ID generator.
 *
 * Format : `{PREFIX}-{6 random digits}` → e.g. `DOC-482931`
 * The 6-digit suffix gives 1 000 000 combinations per prefix,
 * which is sufficient for this application scale.
 */

export type IdPrefix = 'DOC' | 'ADM' | 'PAS' | 'MED' | 'CHR' | 'CHM' | 'DVT' | 'COB' | 'ACT';

export function generatePrefixedId(prefix: IdPrefix): string {
  const digits = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, '0');
  return `${prefix}-${digits}`;
}
