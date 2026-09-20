export type ImportConfig = {
  activityIds: string[];
  categoryIds: string[];
  countries: string[];
  minScore: number;
  autoPublish: boolean;
  /** How often the scheduled sync (Phase 8) should actually run, in hours. The cron endpoint can be pinged more often than this — it only syncs once this many hours have passed since the last completed run. */
  syncIntervalHours: number;
};

/** Auto-publish always starts off — every imported candidate waits for
 * manual review until an admin deliberately opts in. */
export const DEFAULT_IMPORT_CONFIG: ImportConfig = {
  activityIds: [],
  categoryIds: [],
  countries: [],
  minScore: 0,
  autoPublish: false,
  syncIntervalHours: 6,
};
