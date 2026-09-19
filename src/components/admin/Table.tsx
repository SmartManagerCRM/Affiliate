import type { ReactNode } from "react";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-espresso/10 bg-white shadow-[var(--shadow-card)]">
      <table className="w-full min-w-[640px] text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children }: { children: ReactNode }) {
  return (
    <th className="border-b border-espresso/10 bg-beige/50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-espresso/50">
      {children}
    </th>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <td className={`border-b border-espresso/8 px-4 py-3 align-middle text-espresso/80 ${className ?? ""}`}>
      {children}
    </td>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-espresso/15 p-12 text-center text-sm text-espresso/50">
      {children}
    </div>
  );
}
