import { STALE_AFTER_MINUTES } from '../lib/hydrology';

// Visual freshness rule, independent of collector frequency and risk classification.
export const monitoringConfig = {
  staleAfterMinutes: STALE_AFTER_MINUTES,
  stationStaleAfterMinutes: {} as Record<string, number>,
  reconciliationMs: 5 * 60 * 1000,
};
