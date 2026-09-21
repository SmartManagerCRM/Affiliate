"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Radar } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import { discoverAdmitadProgramsAction } from "@/actions/admitadPrograms";

export function DiscoverAdmitadProgramsButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function onClick() {
    setMessage(null);
    startTransition(async () => {
      const result = await discoverAdmitadProgramsAction();
      setMessage(result.message);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button onClick={onClick} disabled={isPending} variant="outline">
        <Radar className={clsx("h-4 w-4", isPending && "animate-spin")} strokeWidth={1.75} />
        {isPending ? "Discovering…" : "Discover Programs"}
      </Button>
      {message && <p className="text-xs text-espresso/50">{message}</p>}
    </div>
  );
}
