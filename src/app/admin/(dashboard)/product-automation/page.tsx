import Image from "next/image";
import Link from "next/link";
import { Radar, RefreshCw, History, Settings2, Sparkles, Gauge, RotateCw, LineChart, Package, AlertTriangle } from "lucide-react";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, TextInput, Checkbox } from "@/components/admin/FormField";
import { SyncAllButton } from "@/components/admin/SyncAllButton";
import { ClassifyPendingButton } from "@/components/admin/ClassifyPendingButton";
import { AutoUpdateButton } from "@/components/admin/AutoUpdateButton";
import { getNetworkStatuses } from "@/lib/productAutomation/registry";
import { isClassificationConfigured } from "@/lib/productAutomation/classification/anthropicClient";
import { isLockActive } from "@/lib/productAutomation/scheduler/syncLock";
import { AUTO_UPDATE_ERROR_TYPES } from "@/lib/productAutomation/update/autoUpdateEngine";
import { getRecentImportErrors } from "@/lib/productAutomation/errors";
import { updateImportConfig } from "@/actions/productAutomation";
import { DEFAULT_IMPORT_CONFIG, type ImportConfig } from "@/lib/productAutomation/importConfig";
import { getAutomationPerformance } from "@/lib/adminAnalytics";
import { isOptimizableImageSrc } from "@/lib/image";

export default async function ProductAutomationPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { saved, error } = await searchParams;
  const { supabase } = await requireAdmin();

  const [
    { data: lastRun },
    { data: activities },
    { data: categories },
    { data: configRow },
    { data: lockRow },
    { count: pendingCount },
    { count: classifiedCount },
    { count: classificationFailedCount },
  ] = await Promise.all([
    supabase
      .from("product_sync_runs")
      .select(
        "id, status, started_at, completed_at, products_found, products_imported, products_updated, products_rejected, errors_count, network:affiliate_networks(name)"
      )
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("activities").select("id, name").order("sort_order"),
    supabase.from("categories").select("id, name, activity_id").order("sort_order"),
    supabase.from("site_settings").select("value").eq("key", "product_automation_config").maybeSingle(),
    supabase.from("product_sync_lock").select("locked_at, locked_by").eq("id", true).maybeSingle(),
    supabase
      .from("product_import_sources")
      .select("id", { count: "exact", head: true })
      .eq("classification_status", "pending"),
    supabase
      .from("product_import_sources")
      .select("id", { count: "exact", head: true })
      .eq("classification_status", "classified"),
    supabase
      .from("product_import_sources")
      .select("id", { count: "exact", head: true })
      .eq("classification_status", "classification_failed"),
  ]);

  const isLocked = isLockActive(lockRow?.locked_at ?? null);

  const networks = getNetworkStatuses();
  const classificationConfigured = isClassificationConfigured();
  const config: ImportConfig = {
    ...DEFAULT_IMPORT_CONFIG,
    ...((configRow?.value as Partial<ImportConfig>) ?? {}),
  };

  const [{ count: totalCandidates }, { count: meetsThresholdCount }, { count: cheaperCount }] = await Promise.all([
    supabase.from("product_import_sources").select("id", { count: "exact", head: true }),
    supabase.from("product_import_sources").select("id", { count: "exact", head: true }).gte("quality_score", config.minScore),
    supabase
      .from("product_import_sources")
      .select("id", { count: "exact", head: true })
      .eq("opportunity_signal->>status", "cheaper"),
  ]);

  const [
    { count: approvedCount },
    { count: automationManagedCount },
    { count: manuallyControlledCount },
    { count: outOfStockCount },
    { count: autoUpdateErrorCount },
  ] = await Promise.all([
    supabase.from("product_import_sources").select("id", { count: "exact", head: true }).eq("approval_status", "approved"),
    supabase.from("offers").select("id", { count: "exact", head: true }).eq("managed_by_automation", true),
    supabase.from("offers").select("id", { count: "exact", head: true }).eq("managed_by_automation", false),
    supabase.from("offers").select("id", { count: "exact", head: true }).eq("availability", "out_of_stock"),
    supabase
      .from("product_import_errors")
      .select("id", { count: "exact", head: true })
      .in("error_type", AUTO_UPDATE_ERROR_TYPES),
  ]);

  const performance = await getAutomationPerformance(supabase);
  const recentErrors = await getRecentImportErrors(supabase, 10);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Product Automation"
        description="Import, review and publish products from connected affiliate networks."
      />

      {saved && (
        <p className="rounded-lg bg-accent-green/10 px-3 py-2 text-sm text-accent-green-dark">
          Import configuration saved.
        </p>
      )}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {/* Network status */}
      <section className="rounded-2xl border border-espresso/10 bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <Radar className="h-4.5 w-4.5 text-espresso/45" strokeWidth={1.75} />
          <h2 className="font-serif-display text-lg font-semibold text-espresso">Network status</h2>
        </div>
        <ul className="divide-y divide-espresso/8">
          {networks.map((n) => (
            <li key={n.key} className="flex items-center justify-between py-3">
              <span className="text-sm font-medium text-espresso">{n.label}</span>
              <div className="flex items-center gap-3">
                {n.key === "admitad" && (
                  <Link href="/admin/product-automation/admitad-programs" className="text-sm font-medium text-accent-green">
                    Manage Programs
                  </Link>
                )}
                {n.key === "cj" && (
                  <Link href="/admin/product-automation/cj-programs" className="text-sm font-medium text-accent-green">
                    Manage Programs
                  </Link>
                )}
                <Badge tone={n.connected ? "green" : "neutral"}>
                  {n.connected ? "Connected" : "Not Connected"}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-espresso/40">
          Connect a network by adding its account-level API credentials as server environment
          variables (never per-program — Admitad&apos;s advertiser programs and feeds are managed
          under &quot;Manage Programs&quot; instead). No credentials are ever sent to the browser.
        </p>
      </section>

      {/* Synchronization */}
      <section className="rounded-2xl border border-espresso/10 bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="h-4.5 w-4.5 text-espresso/45" strokeWidth={1.75} />
            <h2 className="font-serif-display text-lg font-semibold text-espresso">Synchronization</h2>
          </div>
          {isLocked && <Badge tone="gold">Sync in progress ({lockRow?.locked_by ?? "unknown"})</Badge>}
        </div>
        <p className="-mt-2 mb-4 text-xs text-espresso/40">
          Runs every {config.syncIntervalHours}h via the scheduled sync endpoint, or on demand below. A
          lock prevents a scheduled run and a manual sync from ever running at the same time.
        </p>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Stat
            label="Last synchronization"
            value={
              lastRun
                ? new Date(lastRun.started_at).toLocaleString()
                : "Never"
            }
          />
          <Stat label="Products imported" value={lastRun?.products_imported ?? 0} />
          <Stat label="Products updated" value={lastRun?.products_updated ?? 0} />
          <Stat label="Products rejected" value={lastRun?.products_rejected ?? 0} />
          <Stat label="Errors" value={lastRun?.errors_count ?? 0} />
        </div>

        {lastRun && (
          <p className="mt-3 text-xs text-espresso/40">
            {lastRun.network?.name ?? "Unknown network"} ·{" "}
            <span className="capitalize">{lastRun.status}</span>
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <SyncAllButton />
          <ButtonLink href="/admin/product-automation/history" variant="outline">
            <History className="h-4 w-4" strokeWidth={1.75} />
            View Sync History
          </ButtonLink>
        </div>
      </section>

      {/* AI Classification */}
      <section className="rounded-2xl border border-espresso/10 bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4.5 w-4.5 text-espresso/45" strokeWidth={1.75} />
            <h2 className="font-serif-display text-lg font-semibold text-espresso">AI Classification</h2>
          </div>
          <Badge tone={classificationConfigured ? "green" : "neutral"}>
            {classificationConfigured ? "Configured" : "Not Configured"}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Stat label="Pending" value={pendingCount ?? 0} />
          <Stat label="Classified" value={classifiedCount ?? 0} />
          <Stat label="Failed" value={classificationFailedCount ?? 0} />
        </div>

        <p className="mt-3 text-xs text-espresso/40">
          Runs automatically after every sync. Set ANTHROPIC_API_KEY as a server environment
          variable to enable it — classification only ever stages an activity/category/country
          suggestion for review, it never publishes a product directly.
        </p>

        <div className="mt-6">
          <ClassifyPendingButton />
        </div>
      </section>

      {/* Product Scoring */}
      <section className="rounded-2xl border border-espresso/10 bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <Gauge className="h-4.5 w-4.5 text-espresso/45" strokeWidth={1.75} />
          <h2 className="font-serif-display text-lg font-semibold text-espresso">Product Scoring</h2>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Stat label="Staged candidates" value={totalCandidates ?? 0} />
          <Stat label={`Meet score threshold (≥${config.minScore})`} value={meetsThresholdCount ?? 0} />
          <Stat label="Cheaper than existing" value={cheaperCount ?? 0} />
        </div>

        <p className="mt-3 text-xs text-espresso/40">
          The quality score (0–100) reflects real data completeness — image, description, brand,
          identifier, and dedup cleanliness — computed for every candidate automatically at import
          time. &quot;Cheaper than existing&quot; only counts candidates with a real price comparison
          against an already-published, dedup-matched product; nothing here estimates conversions
          or sales performance.
        </p>
      </section>

      {/* Automatic Updates */}
      <section className="rounded-2xl border border-espresso/10 bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <RotateCw className="h-4.5 w-4.5 text-espresso/45" strokeWidth={1.75} />
          <h2 className="font-serif-display text-lg font-semibold text-espresso">Automatic Updates</h2>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Stat label="Approved products" value={approvedCount ?? 0} />
          <Stat label="Auto-managed offers" value={automationManagedCount ?? 0} />
          <Stat label="Manually controlled" value={manuallyControlledCount ?? 0} />
          <Stat label="Out of stock" value={outOfStockCount ?? 0} />
          <Stat label="Write errors (all time)" value={autoUpdateErrorCount ?? 0} />
        </div>

        <p className="mt-3 text-xs text-espresso/40">
          Runs automatically after every sync: refreshes price/availability/image for already-approved
          products straight from the feed. The moment an offer is edited by hand, it&apos;s marked
          &quot;manually controlled&quot; and automation never overwrites it again. An offer that goes
          out of stock is marked unavailable, never deleted — its click history is always preserved. A
          write that fails is never silently dropped — it&apos;s counted here and logged below under
          Recent Errors.
        </p>

        <div className="mt-6">
          <AutoUpdateButton />
        </div>
      </section>

      {/* Performance Intelligence */}
      <section className="rounded-2xl border border-espresso/10 bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <LineChart className="h-4.5 w-4.5 text-espresso/45" strokeWidth={1.75} />
          <h2 className="font-serif-display text-lg font-semibold text-espresso">Performance Intelligence</h2>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Automation-sourced products" value={performance.automationProductCount} />
          <Stat label="With real click data" value={performance.productsWithClicks} />
          <Stat label="No performance data yet" value={performance.productsWithoutClicks} />
          <Stat label="Total clicks (all time)" value={performance.totalClicks} />
        </div>

        {performance.topProducts.length > 0 && (
          <ul className="mt-5 flex flex-col gap-1 border-t border-espresso/8 pt-4">
            {performance.topProducts.map((p) => (
              <li key={p.productId}>
                <Link
                  href={`/admin/products/${p.productId}`}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-beige/50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-beige">
                    {p.mainImage ? (
                      <Image
                        src={p.mainImage}
                        alt=""
                        width={36}
                        height={36}
                        unoptimized={!isOptimizableImageSrc(p.mainImage)}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Package className="h-4 w-4 text-espresso/30" strokeWidth={1.75} />
                    )}
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-espresso">{p.name}</span>
                  <span className="shrink-0 text-sm font-semibold text-espresso">
                    {p.clicks}
                    <span className="ms-1 text-xs font-normal text-espresso/40">click{p.clicks === 1 ? "" : "s"}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-xs text-espresso/40">
          Real affiliate_clicks counts for products that came in through automation — nothing here is
          estimated. There is no order/conversion/revenue data in this schema, so no conversion rate, EPC,
          or revenue figure is ever shown or computed; a product with zero clicks is reported as &quot;No
          performance data yet,&quot; never a fabricated number.
        </p>
      </section>

      {/* Recent Errors */}
      <section className="rounded-2xl border border-espresso/10 bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <AlertTriangle className="h-4.5 w-4.5 text-espresso/45" strokeWidth={1.75} />
          <h2 className="font-serif-display text-lg font-semibold text-espresso">Recent Errors</h2>
        </div>

        {recentErrors.length === 0 ? (
          <p className="py-6 text-center text-sm text-espresso/45">
            No errors recorded — every sync and auto-update write has gone through cleanly.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-espresso/8">
            {recentErrors.map((e) => (
              <li key={e.id} className="py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="red">{e.source === "auto_update" ? "Auto-update" : e.networkName ?? "Sync"}</Badge>
                  <span className="text-xs font-medium uppercase tracking-wide text-espresso/45">{e.errorType}</span>
                  <span className="text-xs text-espresso/40">{new Date(e.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-sm text-espresso">{e.errorMessage}</p>
                {e.externalId && (
                  <p className="mt-0.5 text-xs text-espresso/40">
                    {e.source === "auto_update" ? (
                      <Link href={`/admin/product-candidates/${e.externalId}`} className="text-accent-green-dark hover:underline">
                        View candidate
                      </Link>
                    ) : (
                      `External ID: ${e.externalId}`
                    )}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-xs text-espresso/40">
          Every product rejected during a sync and every failed auto-update write is logged here, in
          full — nothing about a real error is ever summarized away to just a count.
        </p>
      </section>

      {/* Import configuration */}
      <section className="rounded-2xl border border-espresso/10 bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <Settings2 className="h-4.5 w-4.5 text-espresso/45" strokeWidth={1.75} />
          <h2 className="font-serif-display text-lg font-semibold text-espresso">
            Import configuration
          </h2>
        </div>

        <form action={updateImportConfig} className="flex flex-col gap-6">
          <div>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-espresso/45">
              Activities
            </span>
            {activities && activities.length > 0 ? (
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {activities.map((a) => (
                  <Checkbox
                    key={a.id}
                    name="activity_ids"
                    value={a.id}
                    label={a.name}
                    defaultChecked={config.activityIds.includes(a.id)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-espresso/45">No activities yet — add one first.</p>
            )}
          </div>

          <div>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-espresso/45">
              Categories
            </span>
            {categories && categories.length > 0 ? (
              <div className="flex max-h-40 flex-wrap gap-x-6 gap-y-2 overflow-y-auto">
                {categories.map((c) => (
                  <Checkbox
                    key={c.id}
                    name="category_ids"
                    value={c.id}
                    label={c.name}
                    defaultChecked={config.categoryIds.includes(c.id)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-espresso/45">No categories yet — add one first.</p>
            )}
          </div>

          <Field label="Countries" hint="Comma-separated ISO country names/codes, e.g. AE, SA, FR">
            <TextInput name="countries" defaultValue={config.countries.join(", ")} />
          </Field>

          <Field label="Minimum product score" hint="0–100. Candidates below this are held for review, never auto-published.">
            <TextInput type="number" name="min_score" min={0} max={100} defaultValue={config.minScore} />
          </Field>

          <Field
            label="Sync interval (hours)"
            hint="How often the scheduled sync endpoint actually runs a sync. It can be pinged more often than this — it only syncs once this many hours have passed since the last completed run."
          >
            <TextInput type="number" name="sync_interval_hours" min={1} defaultValue={config.syncIntervalHours} />
          </Field>

          <Checkbox
            name="auto_publish"
            label="Auto-publish products that pass review"
            defaultChecked={config.autoPublish}
          />
          <p className="-mt-4 text-xs text-espresso/40">
            Off by default. While off, every imported product waits for manual approval in the
            review queue (Phase 6) before it can appear on the public site.
          </p>

          <div>
            <Button type="submit">Save configuration</Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="font-serif-display text-xl font-semibold text-espresso">{value}</p>
      <p className="mt-0.5 text-xs text-espresso/50">{label}</p>
    </div>
  );
}
