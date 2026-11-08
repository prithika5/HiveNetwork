"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/** Company favicon via Google's free favicon service, gray initial as fallback. */
export function CompanyLogo({ domain, name, size = 18, className }: { domain?: string | null; name?: string | null; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const initial = (name ?? "?").trim()[0]?.toUpperCase() ?? "?";
  if (!domain || failed) {
    return (
      <span
        aria-hidden
        className={cn("inline-flex shrink-0 items-center justify-center rounded-md bg-stone-100 font-semibold text-stone-500", className)}
        style={{ width: size, height: size, fontSize: size * 0.55 }}
      >
        {initial}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={cn("shrink-0 rounded-md border border-line bg-white object-contain", className)}
    />
  );
}
