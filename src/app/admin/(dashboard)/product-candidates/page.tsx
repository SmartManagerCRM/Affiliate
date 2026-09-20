import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { PageHeader } from "@/components/admin/PageHeader";
import { Table, Th, Td, EmptyState } from "@/components/admin/Table";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/admin/FormField";
import { formatPrice } from "@/lib/format";
import {
  approveCandidateAction,
  approveCandidatesAction,
  rejectCandidateAction,
  rejectCandidatesAction,
} from "@/actions/productCandidates";
import type { NormalizedProduct } from "@/lib/productAutomation/types";

const APPROVAL_TONE: Record<string, "gold" | "green" | "red" | "neutral"> = {
  pending: "gold",
  approved: "green",
  rejected: "red",
  needs_review: "neutral",
};

const DEDUP_TONE: Record<string, "green" | "gold"> = {
  unique: "green",
  needs_review: "gold",
};

const CLASSIFICATION_TONE: Record<string, "green" | "gold" | "red" | "neutral"> = {
  classified: "green",
  pending: "neutral",
  classification_failed: "red",
};

export default async function ProductCandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{
    network?: string;
    dedup?: string;
    classification?: string;
    approval?: string;
    min_score?: string;
    saved?: string;
    error?: string;
  }>;
}) {
  const { network, dedup, classification, approval, min_score, saved, error } = await searchParams;
  const { supabase } = await requireAdmin();

  const approvalFilter = approval ?? "pending";
  const minScore = min_score ? Number(min_score) : null;

  let query = supabase
    .from("product_import_sources")
    .select("id, normalized_data, quality_score, opportunity_signal, dedup_status, classification_status, approval_status, network:affiliate_networks(name)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (approvalFilter !== "all") query = query.eq("approval_status", approvalFilter);
  if (network) query = query.eq("network_id", network);
  if (dedup) query = query.eq("dedup_status", dedup);
  if (classification) query = query.eq("classification_status", classification);
  if (minScore !== null && !Number.isNaN(minScore)) query = query.gte("quality_score", minScore);

  const [{ data: candidates }, { data: networks }] = await Promise.all([
    query,
    supabase.from("affiliate_networks").select("id, name").order("name"),
  ]);

  return (
    <div>
      <PageHeader
        title="Product Candidates"
        description="Review staged products imported from affiliate networks before they go live."
      />

      {saved && (
        <p className="mb-4 rounded-lg bg-accent-green/10 px-3 py-2 text-sm text-accent-green-dark">
          {saved === "1" ? "Saved." : saved}
        </p>
      )}
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <form className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <Select name="approval" defaultValue={approvalFilter}>
          <option value="pending">Pending</option>
          <option value="needs_review">Needs Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </Select>
        <Select name="network" defaultValue={network ?? ""}>
          <option value="">All networks</option>
          {(networks ?? []).map((n) => (
            <option key={n.id} value={n.id}>
              {n.name}
            </option>
          ))}
        </Select>
        <Select name="dedup" defaultValue={dedup ?? ""}>
          <option value="">Any dedup status</option>
          <option value="unique">Unique</option>
          <option value="needs_review">Needs Review</option>
        </Select>
        <Select name="classification" defaultValue={classification ?? ""}>
          <option value="">Any classification</option>
          <option value="pending">Pending</option>
          <option value="classified">Classified</option>
          <option value="classification_failed">Failed</option>
        </Select>
        <input
          type="number"
          name="min_score"
          min={0}
          max={100}
          defaultValue={min_score}
          placeholder="Min score"
          className="rounded-lg border border-espresso/15 bg-white px-3.5 py-2.5 text-sm text-espresso focus:border-accent-gold focus:outline-none"
        />
        <button type="submit" className="col-span-2 rounded-full bg-espresso px-4 py-2 text-sm font-medium text-cream sm:col-span-1">
          Filter
        </button>
      </form>

      {candidates && candidates.length > 0 ? (
        <form>
          <div className="mb-3 flex items-center gap-3">
            <button
              type="submit"
              formAction={approveCandidatesAction}
              className="rounded-full bg-accent-green px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-green-dark"
            >
              Approve Selected
            </button>
            <button
              type="submit"
              formAction={rejectCandidatesAction}
              className="rounded-full border border-red-200 px-4 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Reject Selected
            </button>
          </div>

          <Table>
            <thead>
              <tr>
                <Th>
                  <span className="sr-only">Select</span>
                </Th>
                <Th>Product</Th>
                <Th>Network</Th>
                <Th>Price</Th>
                <Th>Score</Th>
                <Th>Dedup</Th>
                <Th>Classification</Th>
                <Th>Approval</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => {
                const product = c.normalized_data as unknown as NormalizedProduct;
                const offer = product.offers?.[0];
                const opportunity = c.opportunity_signal as { status: string; percentBelowExisting?: number } | null;

                return (
                  <tr key={c.id}>
                    <Td>
                      <input type="checkbox" name="ids" value={c.id} className="h-4 w-4 rounded border-espresso/30 accent-accent-green" />
                    </Td>
                    <Td className="font-medium text-espresso">
                      <Link href={`/admin/product-candidates/${c.id}`} className="hover:underline">
                        {product.name || "(no name)"}
                      </Link>
                      {opportunity?.status === "cheaper" && (
                        <span className="ml-2">
                          <Badge tone="green">-{opportunity.percentBelowExisting}%</Badge>
                        </span>
                      )}
                    </Td>
                    <Td>{c.network?.name ?? "—"}</Td>
                    <Td>{offer ? formatPrice(offer.price, offer.currency) : "—"}</Td>
                    <Td>{c.quality_score}</Td>
                    <Td>
                      <Badge tone={DEDUP_TONE[c.dedup_status] ?? "neutral"}>{c.dedup_status}</Badge>
                    </Td>
                    <Td>
                      <Badge tone={CLASSIFICATION_TONE[c.classification_status] ?? "neutral"}>{c.classification_status}</Badge>
                    </Td>
                    <Td>
                      <Badge tone={APPROVAL_TONE[c.approval_status] ?? "neutral"}>{c.approval_status}</Badge>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-3">
                        <Link href={`/admin/product-candidates/${c.id}`} className="text-sm font-medium text-accent-green">
                          Review
                        </Link>
                        <form action={approveCandidateAction} className="inline">
                          <input type="hidden" name="id" value={c.id} />
                          <button type="submit" className="text-sm font-medium text-accent-green">
                            Approve
                          </button>
                        </form>
                        <form action={rejectCandidateAction} className="inline">
                          <input type="hidden" name="id" value={c.id} />
                          <button type="submit" className="text-sm font-medium text-red-600">
                            Reject
                          </button>
                        </form>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </form>
      ) : (
        <EmptyState>
          <ClipboardCheck className="mx-auto mb-3 h-8 w-8 text-espresso/20" strokeWidth={1.5} />
          No candidates match these filters. Run a sync from Product Automation to import some.
        </EmptyState>
      )}
    </div>
  );
}
