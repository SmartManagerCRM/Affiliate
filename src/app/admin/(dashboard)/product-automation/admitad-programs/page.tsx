import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { PageHeader } from "@/components/admin/PageHeader";
import { Table, Th, Td, EmptyState } from "@/components/admin/Table";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { DiscoverAdmitadProgramsButton } from "@/components/admin/DiscoverAdmitadProgramsButton";
import { listAdmitadPrograms } from "@/lib/productAutomation/adapters/admitad/programsStore";
import { deleteAdmitadProgramAction } from "@/actions/admitadPrograms";
import { hasAdmitadCredentials, getAdmitadConfig } from "@/lib/productAutomation/adapters/admitad/config";

export default async function AdmitadProgramsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const { supabase } = await requireAdmin();
  const programs = await listAdmitadPrograms(supabase);
  const connected = hasAdmitadCredentials(getAdmitadConfig());

  return (
    <div>
      <PageHeader
        title="Admitad Programs"
        description="Every advertiser program/feed this account syncs. Adding one here never requires a new Hostinger environment variable — only ADMITAD_CLIENT_ID/SECRET (or ADMITAD_ACCESS_TOKEN) are account-level env vars."
        action={
          <div className="flex items-center gap-3">
            <ButtonLink href="/admin/product-automation/admitad-programs/new" variant="outline">
              + Add Program Manually
            </ButtonLink>
          </div>
        }
      />

      {saved && (
        <p className="mb-4 rounded-lg bg-accent-green/10 px-3 py-2 text-sm text-accent-green-dark">Saved.</p>
      )}

      {!connected && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Admitad account credentials are not configured (ADMITAD_ACCESS_TOKEN, or ADMITAD_CLIENT_ID +
          ADMITAD_CLIENT_SECRET) — discovery and syncing are unavailable until they&apos;re set.
        </p>
      )}

      <div className="mb-6">
        <DiscoverAdmitadProgramsButton />
      </div>

      {programs.length > 0 ? (
        <Table>
          <thead>
            <tr>
              <Th>Advertiser</Th>
              <Th>Country</Th>
              <Th>Feed</Th>
              <Th>Status</Th>
              <Th>Last sync</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {programs.map((p) => (
              <tr key={p.id}>
                <Td className="font-medium text-espresso">{p.advertiserName}</Td>
                <Td>{p.country ?? "—"}</Td>
                <Td>{p.feedUrl ? <Badge tone="green">Configured</Badge> : <Badge tone="gold">Missing feed URL</Badge>}</Td>
                <Td>
                  <Badge tone={p.active ? "green" : "neutral"}>{p.active ? "Active" : "Inactive"}</Badge>
                </Td>
                <Td>
                  {p.lastSyncedAt ? (
                    <>
                      <Badge tone={p.lastSyncStatus === "completed" ? "green" : "red"}>{p.lastSyncStatus}</Badge>{" "}
                      <span className="text-xs text-espresso/40">{new Date(p.lastSyncedAt).toLocaleString()}</span>
                    </>
                  ) : (
                    "Never"
                  )}
                </Td>
                <Td>
                  <div className="flex items-center gap-3">
                    <Link href={`/admin/product-automation/admitad-programs/${p.id}`} className="text-sm font-medium text-accent-green">
                      Edit
                    </Link>
                    <form action={deleteAdmitadProgramAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <ConfirmSubmitButton confirmMessage={`Remove "${p.advertiserName}"?`} className="text-sm font-medium text-red-600">
                        Remove
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <EmptyState>
          No Admitad programs yet. Click &quot;Discover Programs&quot; to pull them from your Admitad account, or add
          one manually if a feed URL isn&apos;t available via discovery.
        </EmptyState>
      )}
    </div>
  );
}
