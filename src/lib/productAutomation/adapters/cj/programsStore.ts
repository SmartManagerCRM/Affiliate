import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { DiscoveredCjContract } from "./contracts";

type SupabaseAdmin = Awaited<ReturnType<typeof createClient>>;

export type CjProgram = {
  id: string;
  cjAdvertiserId: string;
  advertiserName: string;
  programUrl: string | null;
  relationshipStatus: string | null;
  accountStatus: string | null;
  active: boolean;
  discoveredAt: string | null;
  lastSyncedAt: string | null;
  lastSyncStatus: "completed" | "failed" | null;
  lastSyncError: string | null;
  createdAt: string;
};

const SELECT =
  "id, cj_advertiser_id, advertiser_name, program_url, relationship_status, account_status, active, discovered_at, last_synced_at, last_sync_status, last_sync_error, created_at";

function toProgram(row: {
  id: string;
  cj_advertiser_id: string;
  advertiser_name: string;
  program_url: string | null;
  relationship_status: string | null;
  account_status: string | null;
  active: boolean;
  discovered_at: string | null;
  last_synced_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
  created_at: string;
}): CjProgram {
  return {
    id: row.id,
    cjAdvertiserId: row.cj_advertiser_id,
    advertiserName: row.advertiser_name,
    programUrl: row.program_url,
    relationshipStatus: row.relationship_status,
    accountStatus: row.account_status,
    active: row.active,
    discoveredAt: row.discovered_at,
    lastSyncedAt: row.last_synced_at,
    lastSyncStatus: row.last_sync_status as CjProgram["lastSyncStatus"],
    lastSyncError: row.last_sync_error,
    createdAt: row.created_at,
  };
}

export async function listCjPrograms(supabase: SupabaseAdmin): Promise<CjProgram[]> {
  const { data, error } = await supabase.from("cj_programs").select(SELECT).order("advertiser_name");
  if (error) throw new Error(error.message);
  return (data ?? []).map(toProgram);
}

export async function getCjProgram(supabase: SupabaseAdmin, id: string): Promise<CjProgram | null> {
  const { data, error } = await supabase.from("cj_programs").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toProgram(data) : null;
}

export type CreateCjProgramInput = {
  cjAdvertiserId: string;
  advertiserName: string;
  programUrl: string | null;
  active: boolean;
};

/** The manual-entry fallback — an advertiser ID entered by hand, in case discovery is ever unavailable or missing one. Never an env var. */
export async function createCjProgram(supabase: SupabaseAdmin, input: CreateCjProgramInput): Promise<string> {
  const { data, error } = await supabase
    .from("cj_programs")
    .insert({
      cj_advertiser_id: input.cjAdvertiserId,
      advertiser_name: input.advertiserName,
      program_url: input.programUrl,
      active: input.active,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create the program.");
  return data.id;
}

/** The admin's explicit selection/enable toggle — the only field this phase's UI needs to change on an existing program besides deleting it. */
export async function setCjProgramActive(supabase: SupabaseAdmin, id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from("cj_programs").update({ active, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteCjProgram(supabase: SupabaseAdmin, id: string): Promise<void> {
  const { error } = await supabase.from("cj_programs").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export type CjDiscoverySummary = {
  found: number;
  created: number;
  updated: number;
};

/**
 * Upserts discovered contracts by cj_advertiser_id — the unique constraint
 * on that column is the hard backstop, but this selects first so a
 * re-discovery of an already-known advertiser updates its name/status in
 * place instead of ever attempting a duplicate insert. Never touches
 * `active`: that's the admin's own selection (requirement: "allow
 * selecting/enabling programs"), and discovery must never silently flip it
 * either way. Never touches `program_url`/`account_status` either — the
 * Contracts query doesn't report either of those (only Advertiser Lookup
 * did), so overwriting them with null on every re-discovery would destroy
 * real values with nothing to replace them.
 */
export async function upsertDiscoveredCjPrograms(supabase: SupabaseAdmin, discovered: DiscoveredCjContract[]): Promise<CjDiscoverySummary> {
  let created = 0;
  let updated = 0;

  for (const contract of discovered) {
    const { data: existing, error: selectError } = await supabase
      .from("cj_programs")
      .select("id")
      .eq("cj_advertiser_id", contract.cjAdvertiserId)
      .maybeSingle();
    if (selectError) throw new Error(selectError.message);

    if (existing) {
      const { error } = await supabase
        .from("cj_programs")
        .update({
          advertiser_name: contract.advertiserName,
          relationship_status: contract.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      updated += 1;
    } else {
      const { error } = await supabase.from("cj_programs").insert({
        cj_advertiser_id: contract.cjAdvertiserId,
        advertiser_name: contract.advertiserName,
        relationship_status: contract.status,
        active: false,
        discovered_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);
      created += 1;
    }
  }

  return { found: discovered.length, created, updated };
}
