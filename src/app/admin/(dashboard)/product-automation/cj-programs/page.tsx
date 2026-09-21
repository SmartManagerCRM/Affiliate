import { requireAdmin } from "@/lib/supabase/admin-guard";
import { PageHeader } from "@/components/admin/PageHeader";
import { Table, Th, Td, EmptyState } from "@/components/admin/Table";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { DiscoverCjProgramsButton } from "@/components/admin/DiscoverCjProgramsButton";
import { SyncCjButton } from "@/components/admin/SyncCjButton";
import { listCjPrograms } from "@/lib/productAutomation/adapters/cj/programsStore";
import { toggleCjProgramActiveAction, deleteCjProgramAction } from "@/actions/cjPrograms";
import { hasCjCredentials, getCjConfig } from "@/lib/productAutomation/adapters/cj/config";

export default async function CjProgramsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const { supabase } = await requireAdmin();
  const programs = await listCjPrograms(supabase);
  const connected = hasCjCredentials(getCjConfig());

  return (
    <div>
      <PageHeader
        title="CJ Programs"
        description="Every advertiser this CJ account has a relationship with. Adding one here never requires a new Hostinger environment variable — only CJ_API_KEY and CJ_WEBSITE_ID are account-level env vars. Enable an advertiser below, then use Sync CJ (or Sync All) to import its products."
        action={
          <ButtonLink href="/admin/product-automation/cj-programs/new" variant="outline">
            + Add Advertiser Manually
          </ButtonLink>
        }
      />

      {saved && <p className="mb-4 rounded-lg bg-accent-green/10 px-3 py-2 text-sm text-accent-green-dark">Saved.</p>}

      {!connected && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          CJ account credentials are not configured (CJ_API_KEY and CJ_WEBSITE_ID) — discovery is
          unavailable until they&apos;re set.
        </p>
      )}

      <div className="mb-6 flex flex-wrap gap-6">
        <DiscoverCjProgramsButton />
        <SyncCjButton />
      </div>

      {programs.length > 0 ? (
        <Table>
          <thead>
            <tr>
              <Th>Advertiser</Th>
              <Th>Relationship</Th>
              <Th>Account status</Th>
              <Th>Enabled</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {programs.map((p) => (
              <tr key={p.id}>
                <Td className="font-medium text-espresso">
                  {p.programUrl ? (
                    <a href={p.programUrl} target="_blank" rel="noreferrer" className="hover:underline">
                      {p.advertiserName}
                    </a>
                  ) : (
                    p.advertiserName
                  )}
                </Td>
                <Td>
                  {p.relationshipStatus ? (
                    <Badge tone={p.relationshipStatus === "joined" || p.relationshipStatus === "active" ? "green" : "neutral"}>
                      {p.relationshipStatus}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </Td>
                <Td>
                  {p.accountStatus ? <Badge tone={p.accountStatus === "active" ? "green" : "gold"}>{p.accountStatus}</Badge> : "—"}
                </Td>
                <Td>
                  <form action={toggleCjProgramActiveAction} className="inline">
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="active" value={String(p.active)} />
                    <button type="submit">
                      <Badge tone={p.active ? "green" : "neutral"}>{p.active ? "Enabled" : "Disabled"}</Badge>
                    </button>
                  </form>
                </Td>
                <Td>
                  <form action={deleteCjProgramAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <ConfirmSubmitButton confirmMessage={`Remove "${p.advertiserName}"?`} className="text-sm font-medium text-red-600">
                      Remove
                    </ConfirmSubmitButton>
                  </form>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <EmptyState>
          No CJ advertisers yet. Click &quot;Discover Advertisers&quot; to pull them from your CJ account, or add
          one manually if you already know its advertiser ID.
        </EmptyState>
      )}
    </div>
  );
}
