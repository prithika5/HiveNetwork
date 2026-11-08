import { cn } from "@/lib/utils";

const SOFT = ["#F3E8D6", "#E4EBE1", "#E1E8EF", "#EFE3E8", "#E8E4F0", "#F1ECDD", "#E2ECEA"];

function tint(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return SOFT[h % SOFT.length];
}

/** Round avatar: photo if we have one, otherwise soft-colored initials. */
export function Avatar({ src, name, size = 56, className }: { src?: string | null; name?: string | null; size?: number; className?: string }) {
  const label = name ?? "?";
  const initials = label
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-line font-medium text-stone-700", className)}
      style={{ width: size, height: size, background: src ? "#F5F5F4" : tint(label) }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={label} className="h-full w-full object-cover" />
      ) : (
        <span style={{ fontSize: Math.max(11, size / 2.8) }}>{initials}</span>
      )}
    </div>
  );
}

/** Kept for existing imports. */
export const HexAvatar = Avatar;
