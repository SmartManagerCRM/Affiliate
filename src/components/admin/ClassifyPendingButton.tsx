"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import { classifyPendingProductsAction } from "@/actions/productAutomation";

export function ClassifyPendingButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function onClick() {
    setMessage(null);
    startTransition(async () => {
      const result = await classifyPendingProductsAction();
      setMessage(result.message);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button onClick={onClick} disabled={isPending} variant="secondary">
        <Sparkles className={clsx("h-4 w-4", isPending && "animate-pulse")} strokeWidth={1.75} />
        {isPending ? "Classifying…" : "Classify Pending"}
      </Button>
      {message && <p className="text-xs text-espresso/50">{message}</p>}
    </div>
  );
}
