import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { PageHeader } from "@/components/admin/PageHeader";
import { Table, Th, Td, EmptyState } from "@/components/admin/Table";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ButtonLink } from "@/components/ui/Button";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { deleteTrafficSource } from "@/actions/trafficSources";
import { SITE_URL } from "@/lib/constants";

export default async function AdminTrafficSourcesPage() {
  const { supabase } = await requireAdmin();
  const { data: sources } = await supabase
    .from("traffic_sources")
    .select("*, activity:activities(name, slug)")
    .order("name");

  const { data: clickCounts } = await supabase
    .from("affiliate_clicks")
    .select("traffic_source_id");

  const counts = new Map<string, number>();
  (clickCounts ?? []).forEach((c) => {
    if (!c.traffic_source_id) return;
    counts.set(c.traffic_source_id, (counts.get(c.traffic_source_id) ?? 0) + 1);
  });

  return (
    <div>
      <PageHeader
        title="Traffic Sources"
        description="Client websites that link to Selected Items with ?ref=<code>."
        action={<ButtonLink href="/admin/traffic-sources/new">+ Add Traffic Source</ButtonLink>}
      />

      {sources && sources.length > 0 ? (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Link</Th>
              <Th>Clicks</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.id}>
                <Td className="font-medium text-espresso">{s.name}</Td>
                <Td className="font-mono text-xs">
                  {SITE_URL}
                  {s.activity ? `/${s.activity.slug}` : ""}?ref={s.tracking_code}
                </Td>
                <Td>{counts.get(s.id) ?? 0}</Td>
                <Td>
                  <StatusBadge status={s.active ? "true" : "false"} />
                </Td>
                <Td>
                  <div className="flex items-center gap-3">
                    <Link href={`/admin/traffic-sources/${s.id}`} className="text-sm font-medium text-accent-green">
                      Edit
                    </Link>
                    <form action={deleteTrafficSource}>
                      <input type="hidden" name="id" value={s.id} />
                      <ConfirmSubmitButton
                        confirmMessage={`Delete "${s.name}"?`}
                        className="text-sm font-medium text-red-600"
                      >
                        Delete
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <EmptyState>No traffic sources yet.</EmptyState>
      )}
    </div>
  );
}
