/**
 * Wraps a Server Action call from the browser. If the request itself fails (network drop,
 * dev server hiccup, 5xx) the promise would reject and leave the UI stuck in a pending
 * state — instead we resolve to a normal `{ ok: false, error }` result the UI already handles.
 */
export type Failure = { ok: false; error: string };

export async function safe<T>(call: Promise<T>): Promise<T | Failure> {
  try {
    return await call;
  } catch (err) {
    console.error("[server action failed]", err);
    return { ok: false, error: "Couldn't reach the server — check your connection and try again." };
  }
}
