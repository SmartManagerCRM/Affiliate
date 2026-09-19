import { clsx } from "clsx";
import { AFFILIATE_DISCLOSURE } from "@/lib/constants";

export function Disclosure({ className }: { className?: string }) {
  return (
    <p className={clsx("text-xs leading-relaxed text-espresso/45", className)}>
      {AFFILIATE_DISCLOSURE}
    </p>
  );
}
