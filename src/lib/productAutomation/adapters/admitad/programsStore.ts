import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { DiscoveredProgram } from "./discovery";

type SupabaseAdmin = Awaited<ReturnType<typeof createClient>>;

export type AdmitadProgram = {
  id: string;
  admitadProgramId: string | null;
  advertiserName: string;
  country: string | null;
  feedId: string | null;
  feedUrl: string | null;
  feedFormat: string;
  active: boolean;
  discoveredAt: string | null;
  lastSyncedAt: string | null;
  lastSyncStatus: "completed" | "failed" | null;
  lastSyncError: string | null;
  createdAt: string;
};

const SELECT = "id, admitad_program_id, advertiser_name, country, feed_id, feed_url, feed_format, active, discovered_at, last_synced_at, last_sync_status, last_sync_error, created_at";

function toProgram(row: {
  id: string;
  admitad_program_id: string | null;
  advertiser_name: string;
  country: string | null;
  feed_id: string | null;
  feed_url: string | null;
  feed_format: string;
  active: boolean;
  discovered_at: string | null;
  last_synced_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
  created_at: string;
}): AdmitadProgram {
  return {
    id: row.id,
    admitadProgramId: row.admitad_program_id,
    advertiserName: row.advertiser_name,
    country: row.country,
    feedId: row.feed_id,
    feedUrl: row.feed_url,
    feedFormat: row.feed_format,
    active: row.active,
    discoveredAt: row.discovered_at,
    lastSyncedAt: row.last_synced_at,
    lastSyncStatus: row.last_sync_status as AdmitadProgram["lastSyncStatus"],
    lastSyncError: row.last_sync_error,
    createdAt: row.created_at,
  };
}

export async function listAdmitadPrograms(supabase: SupabaseAdmin): Promise<AdmitadProgram[]> {
  const { data, error } = await supabase.from("admitad_programs").select(SELECT).order("advertiser_name");
  if (error) throw new Error(error.message);
  return (data ?? []).map(toProgram);
}

/** Active programs with a usable feed URL — exactly what the sync pipeline iterates. A program missing a feed_url is active but has nothing to sync yet (still returned by listAdmitadPrograms for the admin UI to show that gap). */
export async function listSyncableAdmitadPrograms(supabase: SupabaseAdmin): Promise<AdmitadProgram[]> {
  const { data, error } = await supabase
    .from("admitad_programs")
    .select(SELECT)
    .eq("active", true)
    .not("feed_url", "is", null)
    .order("advertiser_name");
  if (error) throw new Error(error.message);
  return (data ?? []).map(toProgram);
}

export async function getAdmitadProgram(supabase: SupabaseAdmin, id: string): Promise<AdmitadProgram | null> {
  const { data, error } = await supabase.from("admitad_programs").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toProgram(data) : null;
}

export type CreateAdmitadProgramInput = {
  advertiserName: string;
  country: string | null;
  feedId: string | null;
  feedUrl: string | null;
  feedFormat: string;
  active: boolean;
};

/** The manual-entry fallback (requirement: a feed URL Admitad's API can't supply is stored here, by hand, never as an env var). */
export async function createAdmitadProgram(supabase: SupabaseAdmin, input: CreateAdmitadProgramInput): Promise<string> {
  const { data, error } = await supabase
    .from("admitad_programs")
    .insert({
      advertiser_name: input.advertiserName,
      country: input.country,
      feed_id: input.feedId,
      feed_url: input.feedUrl,
      feed_format: input.feedFormat,
      active: input.active,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create the program.");
  return data.id;
}

export type UpdateAdmitadProgramInput = {
  advertiserName: string;
  country: string | null;
  feedId: string | null;
  feedUrl: string | null;
  feedFormat: string;
  active: boolean;
};

export async function updateAdmitadProgram(supabase: SupabaseAdmin, id: string, input: UpdateAdmitadProgramInput): Promise<void> {
  const { error } = await supabase
    .from("admitad_programs")
    .update({
      advertiser_name: input.advertiserName,
      country: input.country,
      feed_id: input.feedId,
      feed_url: input.feedUrl,
      feed_format: input.feedFormat,
      active: input.active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteAdmitadProgram(supabase: SupabaseAdmin, id: string): Promise<void> {
  const { error } = await supabase.from("admitad_programs").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export type DiscoverySummary = {
  found: number;
  created: number;
  updated: number;
};

/**
 * Upserts discovered programs by admitad_program_id — a program already
 * known (by that id) gets its advertiser_name/country/feed_id/feed_url
 * refreshed from the API; a new one is inserted with active=true and
 * discovered_at set. Never touches active/feed_url on a program an admin
 * has since edited by hand for anything OTHER than what discovery itself
 * reports — this only ever reflects what Admitad's API currently says.
 */
export async function upsertDiscoveredPrograms(supabase: SupabaseAdmin, discovered: DiscoveredProgram[]): Promise<DiscoverySummary> {
  let created = 0;
  let updated = 0;

  for (const program of discovered) {
    const { data: existing, error: selectError } = await supabase
      .from("admitad_programs")
      .select("id")
      .eq("admitad_program_id", program.admitadProgramId)
      .maybeSingle();
    if (selectError) throw new Error(selectError.message);

    if (existing) {
      const { error } = await supabase
        .from("admitad_programs")
        .update({
          advertiser_name: program.advertiserName,
          country: program.country,
          feed_id: program.feedId,
          // Only overwrite feed_url with what discovery reports when it
          // actually reports one — never blank out a feed URL an admin
          // entered by hand just because this API call didn't return it.
          ...(program.feedUrl && { feed_url: program.feedUrl }),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      updated += 1;
    } else {
      const { error } = await supabase.from("admitad_programs").insert({
        admitad_program_id: program.admitadProgramId,
        advertiser_name: program.advertiserName,
        country: program.country,
        feed_id: program.feedId,
        feed_url: program.feedUrl,
        active: true,
        discovered_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);
      created += 1;
    }
  }

  return { found: discovered.length, created, updated };
}

export async function recordProgramSyncResult(
  supabase: SupabaseAdmin,
  programId: string,
  result: { status: "completed" | "failed"; errorMessage?: string | null }
): Promise<void> {
  const { error } = await supabase
    .from("admitad_programs")
    .update({
      last_synced_at: new Date().toISOString(),
      last_sync_status: result.status,
      last_sync_error: result.status === "failed" ? (result.errorMessage ?? "Unknown error") : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", programId);
  if (error) throw new Error(error.message);
}
