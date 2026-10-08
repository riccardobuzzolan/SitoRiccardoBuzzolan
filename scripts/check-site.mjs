import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const root = resolve(".");
const required = ["index.html","404.html","robots.txt","sitemap.xml","favicon.ico","apple-touch-icon.png","social-preview.png","assets/css/site.css","assets/js/site.js"];
const errors = [];
for (const file of required) if (!existsSync(join(root,file))) errors.push(`Missing required file: ${file}`);

const html = readFileSync(join(root,"index.html"),"utf8");
for (const needle of [
  '<link href="https://riccardobuzzolan.github.io/SitoRiccardoBuzzolan/" rel="canonical"',
  'application/ld+json',
  'property="og:title"',
  'property="og:description"',
  'property="og:image"',
  'name="twitter:card"',
  './assets/css/site.css',
  './assets/js/site.js'
]) if (!html.includes(needle)) errors.push(`Missing HTML marker: ${needle}`);

if (/data:image\/png;base64/i.test(html)) errors.push("Embedded PNG base64 remains in index.html");
if (/\b(?:AIza|gh[pousr]_|sk-)[A-Za-z0-9_-]{16,}/.test(html)) errors.push("Potential secret found in index.html");

const refs = [...html.matchAll(/(?:href|src)="([^"#?]+)(?:[?#][^"]*)?"/g)].map(m=>m[1]);
for (const ref of refs) {
  if (/^(?:https?:|mailto:|tel:|data:|\/\/)/.test(ref)) continue;
  const clean = ref.replace(/^\.\//,"").replace(/^\//,"");
  if (!clean || clean.endsWith("/")) continue;
  if (!existsSync(join(root,clean))) errors.push(`Missing local asset: ${ref}`);
}

const jsonLd=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
for (const block of jsonLd) {
  try { JSON.parse(block[1]); } catch (e) { errors.push(`Invalid JSON-LD: ${e.message}`); }
}

if(errors.length){ for(const e of errors) console.error("ERROR:",e); process.exit(1); }
console.log("Static site checks passed.");
