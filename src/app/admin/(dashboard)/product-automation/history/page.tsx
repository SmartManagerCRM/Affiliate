import { requireAdmin } from "@/lib/supabase/admin-guard";
import { PageHeader } from "@/components/admin/PageHeader";
import { Table, Th, Td, EmptyState } from "@/components/admin/Table";
import { Badge } from "@/components/ui/Badge";

const STATUS_TONE = {
  completed: "green",
  failed: "red",
  running: "neutral",
} as const;

export default async function ProductAutomationHistoryPage() {
  const { supabase } = await requireAdmin();

  const { data: runs } = await supabase
    .from("product_sync_runs")
    .select(
      "id, status, started_at, completed_at, products_found, products_imported, products_updated, products_rejected, errors_count, error_message, network:affiliate_networks(name)"
    )
    .order("started_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <PageHeader
        title="Sync History"
        description="Every product-automation synchronization attempt, most recent first."
      />

      {runs && runs.length > 0 ? (
        <Table>
          <thead>
            <tr>
              <Th>Network</Th>
              <Th>Started</Th>
              <Th>Completed</Th>
              <Th>Status</Th>
              <Th>Found</Th>
              <Th>Imported</Th>
              <Th>Updated</Th>
              <Th>Rejected</Th>
              <Th>Errors</Th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id}>
                <Td className="font-medium text-espresso">{run.network?.name ?? "—"}</Td>
                <Td>{new Date(run.started_at).toLocaleString()}</Td>
                <Td>{run.completed_at ? new Date(run.completed_at).toLocaleString() : "—"}</Td>
                <Td>
                  <Badge tone={STATUS_TONE[run.status as keyof typeof STATUS_TONE] ?? "neutral"}>
                    {run.status}
                  </Badge>
                  {run.status === "failed" && run.error_message && (
                    <p className="mt-1 max-w-xs truncate text-xs text-red-600" title={run.error_message}>
                      {run.error_message}
                    </p>
                  )}
                </Td>
                <Td>{run.products_found}</Td>
                <Td>{run.products_imported}</Td>
                <Td>{run.products_updated}</Td>
                <Td>{run.products_rejected}</Td>
                <Td>{run.errors_count}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <EmptyState>
          No synchronization runs yet. Connect a network and run &ldquo;Sync All&rdquo; from
          Product Automation to see history here.
        </EmptyState>
      )}
    </div>
  );
}
