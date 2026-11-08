"use client";

import { useState, useTransition } from "react";
import { setVerifiedAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

export function VerifyButton({ id, verified }: { id: string; verified: boolean }) {
  const [v, setV] = useState(verified);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant={v ? "outline" : "default"}
        className="h-9 px-4"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await setVerifiedAction(id, !v);
            if (res.ok) setV(!v);
            else setError(res.error ?? "Failed");
          })
        }
      >
        {pending ? "…" : v ? "Unverify" : "✓ Verify"}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
