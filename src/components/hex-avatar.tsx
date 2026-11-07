import { cn } from "@/lib/utils";

/** Hexagon-shaped avatar with a gold rim. Falls back to initials. */
export function HexAvatar({
  src,
  name,
  size = 56,
  className,
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  const initials = (name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className={cn("hex shrink-0 bg-hive-gold p-[3px]", className)} style={{ width: size, height: size }}>
      <div className="hex flex h-full w-full items-center justify-center overflow-hidden bg-hive-green font-semibold text-hive-gold-light">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={name ?? ""} className="h-full w-full object-cover" />
        ) : (
          <span style={{ fontSize: size / 3 }}>{initials}</span>
        )}
      </div>
    </div>
  );
}
