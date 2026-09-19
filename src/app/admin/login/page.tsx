import { LoginForm } from "@/components/admin/LoginForm";

export const metadata = { title: "Admin Login", robots: { index: false, follow: false } };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-beige px-4">
      <div className="w-full max-w-sm rounded-3xl border border-espresso/10 bg-white p-8 shadow-[var(--shadow-card)]">
        <div className="mb-8 text-center">
          <div className="flex items-baseline justify-center gap-1">
            <span className="font-serif-display text-xl font-semibold text-espresso">Selected</span>
            <span className="font-serif-display text-xl italic text-accent-gold">Items</span>
          </div>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-espresso/40">
            Admin
          </p>
        </div>

        {error === "not_authorized" && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            This account is not an authorized admin. Contact an administrator to be added.
          </p>
        )}

        <LoginForm />
      </div>
    </div>
  );
}
