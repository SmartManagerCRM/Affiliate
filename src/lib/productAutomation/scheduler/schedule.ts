/**
 * Pure "is it time to sync yet" logic — no database access, so it's
 * trivially unit-testable. The cron endpoint can be pinged far more often
 * than the configured interval (cheap and safe to over-call); this is
 * what actually enforces the admin's configured cadence, so the real
 * schedule is controlled entirely from the app at runtime, independent of
 * how often the external trigger (Hostinger's hPanel Cron Jobs, a VPS
 * crontab, any other scheduler) is wired up.
 */
export function isSyncDue(lastCompletedAt: string | null, intervalHours: number, now: Date = new Date()): boolean {
  if (!lastCompletedAt) return true; // never completed a sync -> due
  const elapsedMs = now.getTime() - new Date(lastCompletedAt).getTime();
  return elapsedMs >= intervalHours * 60 * 60 * 1000;
}
