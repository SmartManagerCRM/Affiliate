"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import { syncAllNetworks } from "@/actions/productAutomation";

export function SyncAllButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function onClick() {
    setMessage(null);
    startTransition(async () => {
      const result = await syncAllNetworks();
      setMessage(result.message);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button onClick={onClick} disabled={isPending} variant="secondary">
        <RefreshCw className={clsx("h-4 w-4", isPending && "animate-spin")} strokeWidth={1.75} />
        {isPending ? "Syncing…" : "Sync All"}
      </Button>
      {message && <p className="text-xs text-espresso/50">{message}</p>}
    </div>
  );
}
