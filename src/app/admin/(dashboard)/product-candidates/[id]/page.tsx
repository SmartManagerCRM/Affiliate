import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, TextInput, TextArea, Select, Checkbox } from "@/components/admin/FormField";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { formatPrice } from "@/lib/format";
import {
  approveCandidateAction,
  rejectCandidateAction,
  flagCandidateForReviewAction,
  resetCandidateToPendingAction,
  updateCandidateDetails,
} from "@/actions/productCandidates";
import type { NormalizedProduct } from "@/lib/productAutomation/types";
import { getProductClickStats } from "@/lib/adminAnalytics";

const APPROVAL_TONE: Record<string, "gold" | "green" | "red" | "neutral"> = {
  pending: "gold",
  approved: "green",
  rejected: "red",
  needs_review: "neutral",
};

const CLASSIFICATION_TONE: Record<string, "green" | "neutral" | "red"> = {
  classified: "green",
  pending: "neutral",
  classification_failed: "red",
};

export default async function ProductCandidateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const { saved, error } = await searchParams;
  const { supabase } = await requireAdmin();

  const [{ data: candidate }, { data: activities }, { data: categories }] = await Promise.all([
    supabase
      .from("product_import_sources")
      .select(
        "*, network:affiliate_networks(name), product:product_id(id, name, slug), match_product:dedup_match_product_id(id, name, slug)"
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("activities").select("id, name").order("sort_order"),
    supabase.from("categories").select("id, name, activity_id").order("sort_order"),
  ]);

  if (!candidate) notFound();

  const clickStats = candidate.product_id ? await getProductClickStats(supabase, candidate.product_id) : null;

  const product = candidate.normalized_data as unknown as NormalizedProduct;
  const offer = product.offers?.[0];
  const opportunity = candidate.opportunity_signal as
    | { status: string; percentBelowExisting?: number; existingPrice?: number; candidatePrice?: number; currency?: string; reason?: string }
    | null;
  const qualityFactors = candidate.quality_score_factors as Record<string, boolean> | null;
  const selectedCategoryIds = new Set(candidate.classification_category_ids ?? []);

  const redirectTo = `/admin/product-candidates/${id}`;

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={product.name || "(no name)"}
        description="Review this staged candidate before it becomes a real product."
        action={
          <Link href="/admin/product-candidates" className="text-sm font-medium text-espresso/60">
            ← Back to candidates
          </Link>
        }
      />

      {saved && (
        <p className="mb-4 rounded-lg bg-accent-green/10 px-3 py-2 text-sm text-accent-green-dark">
          {saved === "1" ? "Saved." : saved}
        </p>
      )}
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {/* Status overview */}
      <Section title="Status">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={APPROVAL_TONE[candidate.approval_status] ?? "neutral"}>Approval: {candidate.approval_status}</Badge>
          <Badge tone={candidate.dedup_status === "unique" ? "green" : "gold"}>Dedup: {candidate.dedup_status}</Badge>
          <Badge tone={CLASSIFICATION_TONE[candidate.classification_status] ?? "neutral"}>
            Classification: {candidate.classification_status}
          </Badge>
          <Badge tone="neutral">Quality score: {candidate.quality_score}/100</Badge>
        </div>

        {candidate.product && (
          <p className="mt-3 text-sm text-espresso/60">
            Linked to product:{" "}
            <Link href={`/admin/products/${candidate.product.id}`} className="font-medium text-accent-green">
              {candidate.product.name}
            </Link>
          </p>
        )}

        {clickStats && (
          <p className="mt-3 text-sm text-espresso/60">
            {clickStats.totalClicks > 0
              ? `${clickStats.totalClicks} click${clickStats.totalClicks === 1 ? "" : "s"} all time, last on ${new Date(clickStats.lastClickAt!).toLocaleString()}.`
              : "No performance data yet — this product hasn't had any real clicks recorded."}
          </p>
        )}
        {!candidate.product && candidate.match_product && (
          <p className="mt-3 text-sm text-espresso/60">
            Dedup matched an existing product:{" "}
            <Link href={`/admin/products/${candidate.match_product.id}`} className="font-medium text-accent-green">
              {candidate.match_product.name}
            </Link>{" "}
            — approving will update it instead of creating a new one.
          </p>
        )}
        {candidate.dedup_status === "needs_review" && candidate.dedup_match_source_id && !candidate.dedup_match_product_id && (
          <p className="mt-3 text-sm text-espresso/60">
            Dedup matched another staged candidate (not yet an existing product) — see the raw dedup signals below.
          </p>
        )}

        {qualityFactors && (
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-espresso/50">
            <li>Image: {qualityFactors.hasImage ? "✓" : "✗"}</li>
            <li>Description: {qualityFactors.hasDescription ? "✓" : "✗"}</li>
            <li>Brand: {qualityFactors.hasBrand ? "✓" : "✗"}</li>
            <li>Identifier: {qualityFactors.hasIdentifier ? "✓" : "✗"}</li>
            <li>Dedup clean: {qualityFactors.isDedupClean ? "✓" : "✗"}</li>
          </ul>
        )}

        {opportunity && opportunity.status !== "insufficient_data" && (
          <p className="mt-3 text-sm text-espresso/60">
            {opportunity.status === "cheaper"
              ? `${opportunity.percentBelowExisting}% cheaper than the matched existing product (${formatPrice(opportunity.existingPrice!, opportunity.currency!)} → ${formatPrice(opportunity.candidatePrice!, opportunity.currency!)}).`
              : `Not cheaper than the matched existing product (${formatPrice(opportunity.existingPrice!, opportunity.currency!)} vs ${formatPrice(opportunity.candidatePrice!, opportunity.currency!)}).`}
          </p>
        )}
        {opportunity?.status === "insufficient_data" && (
          <p className="mt-3 text-xs text-espresso/40">No price comparison available: {opportunity.reason}</p>
        )}

        {candidate.classification_reason && (
          <p className="mt-3 text-sm text-espresso/60">
            AI reasoning: {candidate.classification_reason}
            {candidate.classification_confidence !== null && (
              <span className="text-espresso/40"> (confidence {Math.round(candidate.classification_confidence * 100)}%)</span>
            )}
          </p>
        )}
        {candidate.classification_error && (
          <p className="mt-3 text-sm text-red-600">Classification failed: {candidate.classification_error}</p>
        )}
        {candidate.rejection_reason && <p className="mt-3 text-sm text-red-600">Rejection reason: {candidate.rejection_reason}</p>}
      </Section>

      {/* Actions */}
      <Section title="Decision">
        <div className="flex flex-wrap items-center gap-3">
          <form action={approveCandidateAction}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="redirect_to" value={redirectTo} />
            <Button type="submit">Approve</Button>
          </form>

          <form action={rejectCandidateAction} className="flex items-center gap-2">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="redirect_to" value={redirectTo} />
            <TextInput name="reason" placeholder="Rejection reason (optional)" className="w-56" />
            <ConfirmSubmitButton confirmMessage="Reject this candidate?" className="rounded-full border border-red-200 px-5 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50">
              Reject
            </ConfirmSubmitButton>
          </form>

          <form action={flagCandidateForReviewAction}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="redirect_to" value={redirectTo} />
            <Button type="submit" variant="outline">
              Flag for Review
            </Button>
          </form>

          {candidate.approval_status !== "pending" && (
            <form action={resetCandidateToPendingAction}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="redirect_to" value={redirectTo} />
              <Button type="submit" variant="ghost">
                Reset to Pending
              </Button>
            </form>
          )}
        </div>
      </Section>

      {/* Edit */}
      <Section title="Edit before approving">
        <form action={updateCandidateDetails.bind(null, id)} className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Name" required>
              <TextInput name="name" defaultValue={product.name} required />
            </Field>
            <Field label="Brand">
              <TextInput name="brand" defaultValue={product.brand ?? ""} />
            </Field>
          </div>

          <Field label="Description">
            <TextArea name="description" defaultValue={product.description ?? ""} />
          </Field>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Price" required>
              <TextInput type="number" step="0.01" name="price" defaultValue={offer?.price} required />
            </Field>
            <Field label="Currency" required>
              <TextInput name="currency" defaultValue={offer?.currency} required />
            </Field>
            <Field label="Affiliate URL" required>
              <TextInput name="affiliate_url" defaultValue={offer?.affiliateUrl} required />
            </Field>
          </div>

          {product.images.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.images.slice(0, 6).map((url) => (
                <Image key={url} src={url} alt="" width={72} height={72} className="rounded-lg border border-espresso/10 object-cover" unoptimized />
              ))}
            </div>
          )}

          <Field label="Activity">
            <Select name="classification_activity_id" defaultValue={candidate.classification_activity_id ?? ""}>
              <option value="">— None —</option>
              {(activities ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>

          <div>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-espresso/45">Categories</span>
            <div className="flex max-h-40 flex-wrap gap-x-6 gap-y-2 overflow-y-auto">
              {(categories ?? []).map((c) => (
                <Checkbox
                  key={c.id}
                  name="classification_category_ids"
                  value={c.id}
                  label={c.name}
                  defaultChecked={selectedCategoryIds.has(c.id)}
                />
              ))}
            </div>
          </div>

          <div>
            <Button type="submit" variant="outline">
              Save Edits
            </Button>
          </div>
        </form>
      </Section>

      {/* Raw data */}
      <Section title="Raw source data">
        <details>
          <summary className="cursor-pointer text-sm font-medium text-espresso/60">Show raw feed data</summary>
          <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-beige/50 p-4 text-xs text-espresso/70">
            {JSON.stringify(candidate.raw_data, null, 2)}
          </pre>
        </details>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 rounded-2xl border border-espresso/10 bg-white p-5 sm:p-6">
      <h2 className="mb-4 font-serif-display text-lg font-semibold text-espresso">{title}</h2>
      {children}
    </section>
  );
}
