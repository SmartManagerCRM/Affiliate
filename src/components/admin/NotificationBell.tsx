"use client";

import { useState } from "react";
import { Bell } from "lucide-react";

/** No notification system exists yet, so this never shows a fake unread
 * count — it's an honest "you're all caught up" placeholder. */
export function NotificationBell() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        aria-label="Notifications"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-espresso/12 bg-white text-espresso/60 hover:border-espresso/25"
      >
        <Bell className="h-4 w-4" strokeWidth={1.75} />
      </button>

      {open && (
        <div className="absolute end-0 top-11 z-50 w-56 rounded-2xl border border-espresso/10 bg-white p-4 text-center shadow-[var(--shadow-card-hover)]">
          <p className="text-sm font-medium text-espresso">You&apos;re all caught up</p>
          <p className="mt-1 text-xs text-espresso/45">No new notifications</p>
        </div>
      )}
    </div>
  );
}
