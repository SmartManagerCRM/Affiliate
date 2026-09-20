import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type {
  ClassificationResult,
  ClassificationStore,
  ClassificationTaxonomy,
  PendingClassificationCandidate,
} from "./classificationStore";
import type { NormalizedProduct } from "../types";

type SupabaseAdmin = Awaited<ReturnType<typeof createClient>>;

/** Production ClassificationStore backed by product_import_sources / activities / categories. */
export class SupabaseClassificationStore implements ClassificationStore {
  constructor(private readonly supabase: SupabaseAdmin) {}

  async loadTaxonomy(): Promise<ClassificationTaxonomy> {
    const [activitiesResult, categoriesResult] = await Promise.all([
      this.supabase.from("activities").select("id, name").eq("active", true),
      this.supabase.from("categories").select("id, name, activity_id").eq("active", true),
    ]);

    if (activitiesResult.error) throw new Error(activitiesResult.error.message);
    if (categoriesResult.error) throw new Error(categoriesResult.error.message);

    return {
      activities: (activitiesResult.data ?? []).map((a) => ({ id: a.id, name: a.name })),
      categories: (categoriesResult.data ?? []).map((c) => ({ id: c.id, name: c.name, activityId: c.activity_id })),
    };
  }

  async findPendingCandidates(limit: number): Promise<PendingClassificationCandidate[]> {
    const { data, error } = await this.supabase
      .from("product_import_sources")
      .select("id, normalized_data")
      .eq("classification_status", "pending")
      .not("import_status", "in", "(rejected,failed)")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) throw new Error(error.message);

    return (data ?? []).map((row) => ({
      importSourceId: row.id,
      product: row.normalized_data as unknown as NormalizedProduct,
    }));
  }

  async updateClassificationResult(importSourceId: string, result: ClassificationResult): Promise<void> {
    const update =
      result.status === "classified"
        ? {
            classification_status: "classified" as const,
            classification_activity_id: result.activityId,
            classification_category_ids: result.categoryIds,
            classification_countries: result.countries,
            classification_confidence: result.confidence,
            classification_reason: result.reason,
            classification_attempts: result.attempts,
            classification_error: null,
            classified_at: new Date().toISOString(),
          }
        : {
            classification_status: "classification_failed" as const,
            classification_error: result.error,
            classification_attempts: result.attempts,
          };

    const { error } = await this.supabase.from("product_import_sources").update(update).eq("id", importSourceId);
    if (error) throw new Error(error.message);
  }
}
