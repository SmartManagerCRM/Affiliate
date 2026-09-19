import { Badge } from "@/components/ui/Badge";

export function StatusBadge({ status }: { status: string }) {
  if (status === "published" || status === "active" || status === "true") {
    return <Badge tone="green">{status === "true" ? "Active" : status}</Badge>;
  }
  if (status === "draft") return <Badge tone="gold">Draft</Badge>;
  if (status === "inactive" || status === "false") {
    return <Badge tone="neutral">{status === "false" ? "Inactive" : status}</Badge>;
  }
  return <Badge tone="neutral">{status}</Badge>;
}
