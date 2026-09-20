export type ImportConfig = {
  activityIds: string[];
  categoryIds: string[];
  countries: string[];
  minScore: number;
  autoPublish: boolean;
};

/** Auto-publish always starts off — every imported candidate waits for
 * manual review until an admin deliberately opts in. */
export const DEFAULT_IMPORT_CONFIG: ImportConfig = {
  activityIds: [],
  categoryIds: [],
  countries: [],
  minScore: 0,
  autoPublish: false,
};
