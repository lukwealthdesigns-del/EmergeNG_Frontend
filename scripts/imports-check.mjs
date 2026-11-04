// Resolves every relative import (static + dynamic), reports missing files and files unreachable from src/main.jsx.
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
const root = resolve("src"); const exts = ["", ".js", ".jsx", ".mjs", "/index.js", "/index.jsx"];
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk(root).filter((f) => /\.(jsx?|mjs)$/.test(f));
const res = (from, spec) => { const base = resolve(dirname(from), spec); for (const e of exts) { const p = base + e; if (existsSync(p) && statSync(p).isFile()) return p; } return null; };
const re = /(?:import|export)\s[^'"]*?from\s*["'](\.[^"']+)["']|import\s*["'](\.[^"']+)["']|import\(\s*["'](\.[^"']+)["']\s*\)/g;
const graph = new Map(); const missing = [];
for (const f of files) { const src = readFileSync(f, "utf8"); const out = []; let m; while ((m = re.exec(src))) { const spec = m[1] || m[2] || m[3]; const r = res(f, spec); if (!r) missing.push(`${relative(root, f)} -> ${spec}`); else out.push(r); } graph.set(f, out); }
const seen = new Set(); const q = [join(root, "main.jsx")];
while (q.length) { const f = q.pop(); if (seen.has(f) || !graph.has(f)) continue; seen.add(f); q.push(...graph.get(f)); }
const dead = files.filter((f) => !seen.has(f)).map((f) => relative(root, f));
console.log(`${files.length} files; ${missing.length} unresolved imports; ${dead.length} unreachable from main.jsx`);
missing.forEach((m) => console.log("MISSING", m)); dead.forEach((d) => console.log("UNREACHABLE", d));
process.exit(missing.length ? 1 : 0);
