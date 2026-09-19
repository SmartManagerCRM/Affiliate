import type { ReactNode } from "react";
import { clsx } from "clsx";

export function Field({
  label,
  hint,
  children,
  required,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-espresso/60">
        {label}
        {required && <span className="text-accent-gold"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-espresso/40">{hint}</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-espresso/15 bg-white px-3.5 py-2.5 text-sm text-espresso focus:border-accent-gold focus:outline-none";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputClass} />;
}

export function TextArea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={clsx(inputClass, className ?? "min-h-24")} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={inputClass} />;
}

export function Checkbox({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm text-espresso/75">
      <input type="checkbox" {...props} className="h-4 w-4 rounded border-espresso/30 accent-accent-green" />
      {label}
    </label>
  );
}
