import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl bg-white p-6 shadow-card ring-1 ring-black/[0.04] ${className}`}>{children}</div>;
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-ink-3">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

type Variant = "primary" | "secondary" | "ghost" | "accent";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-black disabled:bg-ink-3/40",
  secondary: "bg-white text-ink ring-1 ring-line hover:bg-canvas disabled:text-ink-3",
  ghost: "text-ink-2 hover:bg-black/[0.04] hover:text-ink disabled:text-ink-3",
  accent: "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-200",
};

export function Button({ className = "", variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

export function Input({
  label,
  error,
  trailing,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; trailing?: ReactNode }) {
  const errorId = error && props.name ? `${props.name}-error` : undefined;
  return (
    <div>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
        <span className="relative block">
          <input
            aria-invalid={error ? true : undefined}
            aria-describedby={errorId}
            className={`h-11 w-full rounded-xl px-4 text-[15px] text-ink outline-none ring-1 transition placeholder:text-ink-3 focus:bg-white focus:ring-2 ${
              error
                ? "bg-brand-50/60 ring-brand-500/50 focus:ring-brand-500/50"
                : "bg-canvas ring-transparent focus:ring-brand-500/40"
            } ${trailing ? "pr-12" : ""} ${className}`}
            {...props}
          />
          {trailing && <span className="absolute inset-y-0 right-1.5 flex items-center">{trailing}</span>}
        </span>
      </label>
      {error && (
        <p id={errorId} className="mt-1.5 text-[13px] text-brand-600">
          {error}
        </p>
      )}
    </div>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`size-4 animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-700">{children}</p>;
}

const BADGE_TONES = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/15",
  gray: "bg-canvas text-ink-2 ring-black/5",
  brand: "bg-brand-50 text-brand-700 ring-brand-600/15",
};

export function Badge({ tone = "gray", children, icon }: { tone?: keyof typeof BADGE_TONES; children: ReactNode; icon?: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${BADGE_TONES[tone]}`}>
      {icon}
      {children}
    </span>
  );
}

// Avatar tints are picked from the name so the same person always looks the same.
const AVATAR_TINTS = [
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
  "bg-amber-100 text-amber-800",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
  "bg-orange-100 text-orange-700",
];

export function Avatar({ name, size = "md", className = "" }: { name: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  const tint = AVATAR_TINTS[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % AVATAR_TINTS.length];
  const sizes = { sm: "size-7 text-[11px]", md: "size-9 text-xs", lg: "size-14 text-lg" };
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${tint} ${sizes[size]} ${className}`} title={name}>
      {initials || "?"}
    </span>
  );
}

export function AvatarStack({ names, total }: { names: string[]; total: number }) {
  const extra = total - names.length;
  return (
    <div className="flex -space-x-2">
      {names.map((n, i) => (
        <Avatar key={i} name={n} size="sm" className="ring-2 ring-white" />
      ))}
      {extra > 0 && (
        <span className="inline-flex size-7 items-center justify-center rounded-full bg-canvas text-[11px] font-semibold text-ink-2 ring-2 ring-white">
          +{extra}
        </span>
      )}
    </div>
  );
}

export function Progress({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-canvas" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-emerald-500" : "bg-brand-500"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
