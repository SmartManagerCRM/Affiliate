"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function onClick() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      onClick={onClick}
      className="rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10"
    >
      Sign out
    </button>
  );
}
