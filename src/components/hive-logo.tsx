import { cn } from "@/lib/utils";

/** Hexagon + rocket mark. Our own logo — Sac State green & gold. */
export function HiveLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("h-8 w-8", className)}>
      <path d="M16 1.5 29 9v14L16 30.5 3 23V9z" fill="#043927" />
      <path d="M16 1.5 29 9v14L16 30.5 3 23V9z" fill="none" stroke="#C4B581" strokeWidth="1.5" />
      <path d="M16 7c2.6 2 4 5 4 8.5V20h-8v-4.5C12 12 13.4 9 16 7z" fill="#C4B581" />
      <circle cx="16" cy="14" r="1.6" fill="#043927" />
      <path d="M12 18l-2.2 3.2H12zM20 18l2.2 3.2H20z" fill="#C4B581" />
      <path d="M14.5 21h3l-1.5 3.5z" fill="#f3efe0" />
    </svg>
  );
}
