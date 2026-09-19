import { ResetPasswordForm } from "@/components/admin/ResetPasswordForm";

export const metadata = { title: "Reset Password", robots: { index: false, follow: false } };

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-beige px-4">
      <div className="w-full max-w-sm rounded-3xl border border-espresso/10 bg-white p-8 shadow-[var(--shadow-card)]">
        <div className="mb-8 text-center">
          <div className="flex items-baseline justify-center gap-1">
            <span className="font-serif-display text-xl font-semibold text-espresso">Selected</span>
            <span className="font-serif-display text-xl italic text-accent-gold">Items</span>
          </div>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-espresso/40">
            Reset Password
          </p>
        </div>

        <ResetPasswordForm />
      </div>
    </div>
  );
}
