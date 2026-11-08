// Lets Node scripts import app code (src/…) directly: resolves the "@/…" alias and
// extensionless imports, and stubs "server-only" (scripts run on the server anyway).
// Usage: node --conditions=react-server --import ./scripts/register.mjs scripts/<script>.mts
import { register } from "node:module";
register("./resolve-hooks.mjs", import.meta.url);
