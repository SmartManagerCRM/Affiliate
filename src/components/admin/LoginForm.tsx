"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"sign-in" | "forgot">("sign-in");
  const [resetSent, setResetSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  async function onResetRequest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/reset-password`,
    });

    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setResetSent(true);
  }

  if (mode === "forgot") {
    return (
      <form onSubmit={onResetRequest} className="flex flex-col gap-4">
        {resetSent ? (
          <p className="rounded-lg bg-accent-green/10 px-3 py-2 text-sm text-accent-green-dark">
            If an account exists for that email, a reset link is on its way.
          </p>
        ) : (
          <>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-espresso/60">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-espresso/15 px-3.5 py-2.5 text-sm focus:border-accent-gold focus:outline-none"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={loading} className="mt-2 w-full">
              {loading ? "Sending…" : "Send reset link"}
            </Button>
          </>
        )}
        <button
          type="button"
          onClick={() => {
            setMode("sign-in");
            setError(null);
            setResetSent(false);
          }}
          className="text-center text-sm font-medium text-espresso/60 hover:text-espresso"
        >
          Back to sign in
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-espresso/60">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-espresso/15 px-3.5 py-2.5 text-sm focus:border-accent-gold focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-espresso/60">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-espresso/15 px-3.5 py-2.5 text-sm focus:border-accent-gold focus:outline-none"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading} className="mt-2 w-full">
        {loading ? "Signing in…" : "Sign in"}
      </Button>
      <button
        type="button"
        onClick={() => {
          setMode("forgot");
          setError(null);
        }}
        className="text-center text-sm font-medium text-espresso/60 hover:text-espresso"
      >
        Forgot password?
      </button>
    </form>
  );
}
