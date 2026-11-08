import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = fileURLToPath(new URL("../src/", import.meta.url));

export async function resolve(spec, ctx, next) {
  if (spec === "server-only") return { url: "data:text/javascript,", shortCircuit: true };
  let target = null;
  if (spec.startsWith("@/")) target = SRC + spec.slice(2);
  else if (spec.startsWith(".") && ctx.parentURL && fileURLToPath(ctx.parentURL).startsWith(SRC)) {
    target = fileURLToPath(new URL(spec, ctx.parentURL));
  }
  if (target && !/\.(ts|tsx|js|mjs)$/.test(target)) {
    for (const ext of [".ts", ".tsx", "/index.ts"]) {
      if (existsSync(target + ext)) {
        target += ext;
        break;
      }
    }
  }
  return target ? next(pathToFileURL(target).href, ctx) : next(spec, ctx);
}
