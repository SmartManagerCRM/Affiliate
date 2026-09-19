"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export function ResetPasswordForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    // Clicking the emailed reset link lands here with a recovery token in the
    // URL, which the client exchanges for a session automatically.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    const timeout = setTimeout(() => {
      setReady((current) => {
        if (!current) setInvalidLink(true);
        return current;
      });
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.push("/admin");
      router.refresh();
    }, 1500);
  }

  if (invalidLink) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          This reset link is invalid or has expired. Request a new one from the sign-in page.
        </p>
        <Button
          type="button"
          onClick={() => router.push("/admin/login")}
          variant="outline"
          className="w-full"
        >
          Back to sign in
        </Button>
      </div>
    );
  }

  if (!ready) {
    return <p className="text-center text-sm text-espresso/50">Verifying reset link…</p>;
  }

  if (success) {
    return (
      <p className="rounded-lg bg-accent-green/10 px-3 py-2 text-sm text-accent-green-dark">
        Password updated. Redirecting to the dashboard…
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-espresso/60">
          New password
        </label>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-espresso/15 px-3.5 py-2.5 text-sm focus:border-accent-gold focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-espresso/60">
          Confirm new password
        </label>
        <input
          type="password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded-lg border border-espresso/15 px-3.5 py-2.5 text-sm focus:border-accent-gold focus:outline-none"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading} className="mt-2 w-full">
        {loading ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
