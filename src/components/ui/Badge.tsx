import { clsx } from "clsx";
import type { ReactNode } from "react";

type Tone = "gold" | "green" | "espresso" | "neutral" | "red";

const tones: Record<Tone, string> = {
  gold: "bg-accent-gold/15 text-accent-gold-dark",
  green: "bg-accent-green/15 text-accent-green-dark",
  espresso: "bg-espresso text-cream",
  neutral: "bg-beige text-espresso/70",
  red: "bg-red-50 text-red-700",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
