// Lists translation keys used in src/ but missing from the English catalogue, and (with --lang) keys missing per language.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
const src = resolve("src");
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk(src).filter((f) => /\.(jsx?)$/.test(f) && !f.includes("/locales/"));
const load = async (dir) => Object.assign({}, ...(await Promise.all(readdirSync(resolve(dir)).filter((f) => f.endsWith(".js") && !["index.js", "legal.js"].includes(f)).map((f) => f.slice(0, -3)).map(async (n) => (await import(resolve(dir, n + ".js"))).default))));
const en = await load("src/i18n/locales/en");
const used = new Map(); const dyn = new Map();
const add = (m, k, f) => { if (!m.has(k)) m.set(k, new Set()); m.get(k).add(f.replace(src + "/", "")); };
for (const f of files) {
  const s = readFileSync(f, "utf8");
  for (const m of s.matchAll(/\b(?:t|has)\(\s*["'`]([a-zA-Z0-9_.${}\-]+)["'`]/g)) { const k = m[1]; (k.includes("${") ? dyn : used).has(k) || add(k.includes("${") ? dyn : used, k, f); }
  for (const m of s.matchAll(/\b(?:titleKey|labelKey|key|msgKey)\s*[:=]\s*["']([a-z]+\.[a-zA-Z0-9_.]+)["']/g)) add(used, m[1], f);
}
const missing = [...used.keys()].filter((k) => !(k in en)).sort();
console.log(`en keys: ${Object.keys(en).length}; used literal keys: ${used.size}; missing in en: ${missing.length}`);
for (const k of missing) console.log("MISSING", k, "←", [...used.get(k)][0]);
console.log("\nDYNAMIC (verify manually):"); for (const [k, v] of dyn) console.log(" ", k, "←", [...v][0]);
const lang = process.argv.includes("--lang") ? process.argv[process.argv.indexOf("--lang") + 1] : null;
if (lang) {
  // Scope for translation: everything citizen-facing (common, citizen, extra) + legal summaries. Staff screens (ops/partner/admin) fall back to English by design.
  const dir = resolve(`src/i18n/locales/${lang}`);
  const scopeKeys = new Set();
  for (const n of ["common", "citizen", "extra", "v2"]) Object.keys((await import(resolve("src/i18n/locales/en", n + ".js"))).default).forEach((k) => scopeKeys.add(k));
  ["legal.privacy.title", "legal.privacy.summary", "legal.terms.title", "legal.terms.summary"].forEach((k) => scopeKeys.add(k));
  const tr = await load(dir);
  const ph = (v) => (String(v).match(/\{[a-zA-Z0-9_]+\}/g) || []).sort().join(",");
  const enAll = { ...en, "legal.privacy.title": "", "legal.privacy.summary": "", "legal.terms.title": "", "legal.terms.summary": "" };
  const miss = [...scopeKeys].filter((k) => !(k in tr) || String(tr[k]).trim() === "");
  const unknown = Object.keys(tr).filter((k) => !(k in enAll));
  const badPh = [...scopeKeys].filter((k) => k in tr && enAll[k] && ph(enAll[k]) !== ph(tr[k]));
  const same = [...scopeKeys].filter((k) => k in tr && enAll[k] && String(tr[k]) === String(enAll[k]) && String(enAll[k]).length > 25);
  console.log(`\n[${lang}] scope ${scopeKeys.size}; translated ${scopeKeys.size - miss.length}; missing ${miss.length}; unknown ${unknown.length}; placeholder mismatch ${badPh.length}; identical-to-English (long) ${same.length}`);
  miss.slice(0, 40).forEach((k) => console.log("  MISSING", k)); unknown.slice(0, 20).forEach((k) => console.log("  UNKNOWN", k)); badPh.slice(0, 20).forEach((k) => console.log("  PLACEHOLDER", k, "en:", ph(enAll[k]), "tr:", ph(tr[k]))); same.slice(0, 10).forEach((k) => console.log("  UNTRANSLATED?", k));
  if (miss.length || unknown.length || badPh.length) process.exit(1);
}
