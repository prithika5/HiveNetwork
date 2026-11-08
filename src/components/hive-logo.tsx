import { cn } from "@/lib/utils";

/**
 * Original minimal line-style hornet — charcoal strokes with one honey stripe.
 * Not based on any official Sac State mark.
 */
export function HornetIcon({ className, accent = true }: { className?: string; accent?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden className={cn("h-7 w-7", className)} strokeLinecap="round" strokeLinejoin="round">
      <g stroke="#292524" strokeWidth="1.6">
        <path d="M14.2 7.2C13.4 5.4 11.9 4.2 10.2 4" />
        <path d="M17.8 7.2C18.6 5.4 20.1 4.2 21.8 4" />
        <circle cx="16" cy="9.4" r="2.6" />
        <ellipse cx="16" cy="14.6" rx="3" ry="2.5" />
        <path d="M13.3 13.6C9.6 11 5.2 11.4 5.2 14.1c0 2.4 4.4 2.7 8.1 1.2" />
        <path d="M18.7 13.6c3.7-2.6 8.1-2.2 8.1.5 0 2.4-4.4 2.7-8.1 1.2" />
        <path d="M16 17.4c-3.1 0-4.3 3.2-3.8 5.6.5 2.7 2.4 4.6 3.8 5.6 1.4-1 3.3-2.9 3.8-5.6.5-2.4-.7-5.6-3.8-5.6Z" />
        <path d="M12.8 24.6h6.4" />
      </g>
      {accent && <path d="M12.3 21.2h7.4" stroke="#C8A24A" strokeWidth="1.9" />}
    </svg>
  );
}

/** Kept for existing imports. */
export const HiveLogo = HornetIcon;
