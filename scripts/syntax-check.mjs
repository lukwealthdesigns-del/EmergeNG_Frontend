// Parses every .js/.jsx file with esbuild (no bundling) to catch syntax errors. Not a substitute for `vite build`.
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let esbuild; try { esbuild = require("esbuild"); } catch { esbuild = require("/opt/npm-tools/node_modules/esbuild"); }
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
let bad = 0, n = 0;
for (const f of [...walk("src"), "public/sw.js"].filter((f) => /\.(jsx?|mjs)$/.test(f))) {
  n++; try { esbuild.transformSync(await (await import("node:fs/promises")).readFile(f, "utf8"), { loader: "jsx", format: "esm" }); } catch (e) { bad++; console.error("✗", f, e.errors?.[0]?.text, e.errors?.[0]?.location?.line); }
}
console.log(`${n} files checked, ${bad} with syntax errors`); process.exit(bad ? 1 : 0);
