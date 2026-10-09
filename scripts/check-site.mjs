import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CANONICAL = 'https://riccardobuzzolan.github.io/SitoRiccardoBuzzolan/';
const decode = value => value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");

export function attributes(tag) {
  const result = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) result[match[1].toLowerCase()] = decode(match[2] ?? match[3] ?? match[4]);
  return result;
}

export function localReference(reference, page, base, root) {
  if (/^(?:mailto:|tel:|data:)/i.test(reference)) return null;
  const url = new URL(reference, new URL(page, base));
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsafe reference scheme.');
  const site = new URL(base);
  if (url.origin !== site.origin) return null;
  if (!url.pathname.startsWith(site.pathname)) {
    if (/^(?:https?:|\/\/)/i.test(reference)) return null;
    throw new Error('Relative reference escapes the published project.');
  }
  const path = resolve(root, decodeURIComponent(url.pathname.slice(site.pathname.length)) || 'index.html');
  if (path !== root && !path.startsWith(`${root}${sep}`)) throw new Error('Reference escapes the repository.');
  return { path: existsSync(path) && statSync(path).isDirectory() ? join(path, 'index.html') : path, hash: decodeURIComponent(url.hash.slice(1)) };
}

export function inspectHtml(html, name, root) {
  const errors = [];
  const tags = [...html.matchAll(/<(?:a|link|script|img|source|iframe|meta|input|label|button)\b[^>]*>/gi)].map(match => ({ name: /^<([a-z]+)/i.exec(match[0])[1].toLowerCase(), attrs: attributes(match[0]) }));
  const canonicals = tags.filter(tag => tag.name === 'link' && tag.attrs.rel === 'canonical');
  const meta = key => tags.find(tag => tag.name === 'meta' && (tag.attrs.name === key || tag.attrs.property === key))?.attrs.content;
  if (!/<!doctype html>/i.test(html) || !/<html\b[^>]*lang=["']it["']/i.test(html) || !/<head\b/i.test(html) || !/<body\b/i.test(html) || !/<main\b/i.test(html)) errors.push(`${name}: missing semantic document structure`);
  if ((html.match(/<h1\b/gi) ?? []).length !== 1 || !/<title>[^<]+<\/title>/i.test(html)) errors.push(`${name}: expected one H1 and a title`);
  if (canonicals.length !== 1 || canonicals[0]?.attrs.href !== CANONICAL) errors.push(`${name}: canonical must target the primary URL`);
  if (!meta('description')) errors.push(`${name}: missing description`);
  if (name === 'index.html') {
    for (const key of ['og:title', 'og:description', 'og:image', 'og:url', 'twitter:card', 'twitter:image']) if (!meta(key)) errors.push(`${name}: missing ${key}`);
    if (meta('og:url') !== CANONICAL) errors.push(`${name}: Open Graph URL differs from canonical`);
    if (/\bnoindex\b/.test(meta('robots') ?? '')) errors.push(`${name}: production homepage is noindex`);
  } else if (!/\bnoindex\b/.test(meta('robots') ?? '')) errors.push(`${name}: 404 must remain noindex`);
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
  if (ids.length !== new Set(ids).size) errors.push(`${name}: duplicate element IDs`);
  if (/\son[a-z]+\s*=/i.test(html)) errors.push(`${name}: inline event handler`);
  if (/data:image\/[^;,]+;base64/i.test(html)) errors.push(`${name}: embedded bitmap should be an asset`);
  let jsonLd = 0;
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = attributes(match[1]);
    if (attrs.type === 'application/ld+json') {
      jsonLd++;
      try { const value = JSON.parse(match[2]); if (!value || typeof value !== 'object') throw new Error(); } catch { errors.push(`${name}: invalid JSON-LD`); }
    } else if (!attrs.src && match[2].trim()) errors.push(`${name}: inline JavaScript is blocked by CSP`);
  }
  if (name === 'index.html' && !jsonLd) errors.push(`${name}: missing JSON-LD`);
  for (const tag of tags) {
    if (tag.name === 'img' && tag.attrs.alt === undefined) errors.push(`${name}: image has no alternative text`);
    if (tag.name === 'iframe' && !tag.attrs.title) errors.push(`${name}: embedded frame has no title`);
    if (tag.name === 'label' && tag.attrs.for && !ids.includes(tag.attrs.for)) errors.push(`${name}: label target missing`);
  }
  const refs = [...tags.filter(tag => tag.attrs.rel !== 'canonical').flatMap(tag => [tag.attrs.href, tag.attrs.src, ...(tag.attrs.srcset ? tag.attrs.srcset.split(',').map(part => part.trim().split(/\s+/)[0]) : [])].filter(Boolean)), ...[meta('og:image'), meta('twitter:image')].filter(Boolean)];
  for (const base of [CANONICAL, 'https://secondary.invalid/']) {
    for (const reference of refs) {
      try {
        const local = localReference(reference, name, base, root);
        if (!local) continue;
        if (!existsSync(local.path)) errors.push(`${name}: missing local file (${relative(root, local.path)})`);
        else if (local.hash && local.path.endsWith('.html')) {
          const target = readFileSync(local.path, 'utf8');
          if (![...target.matchAll(/\bid=["']([^"']+)["']/g)].some(match => match[1] === local.hash)) errors.push(`${name}: missing local fragment #${local.hash}`);
        }
      } catch { errors.push(`${name}: unsafe or invalid reference`); }
    }
  }
  return [...new Set(errors)];
}

export function inspectSource(text, name) {
  const errors = [];
  if (!text.endsWith('\n') || /[\t ]+(?=\r?$)/m.test(text)) errors.push(`${name}: source formatting (final newline / trailing whitespace)`);
  const patterns = [
    ['private key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
    ['GitHub token', /\bgh[pousr]_[A-Za-z0-9_]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b/],
    ['cloud access key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
    ['private API token', /\bsk-(?:proj-)?[A-Za-z0-9_-]{24,}\b/],
    ['service account credential', /"private_key"\s*:\s*"[^"\n]+/]
  ];
  for (const [kind, pattern] of patterns) if (pattern.test(text)) errors.push(`${name}: potential ${kind}; value omitted`);
  if (/\.js$/.test(name) && /data:image\/[^;,]+;base64/i.test(text)) errors.push(`${name}: embedded bitmap should be an asset`);
  return errors;
}

export function checkSite(directory = '.') {
  const root = resolve(directory);
  const errors = [];
  const required = ['index.html', '404.html', 'robots.txt', 'sitemap.xml', 'favicon.ico', 'apple-touch-icon.png', 'social-preview.png', 'assets/css/site.css', 'assets/js/site.js', 'assets/images/portrait.webp'];
  for (const name of required) if (!existsSync(join(root, name))) errors.push(`Missing required file: ${name}`);
  for (const name of ['index.html', '404.html']) if (existsSync(join(root, name))) errors.push(...inspectHtml(readFileSync(join(root, name), 'utf8'), name, root));
  const robots = readFileSync(join(root, 'robots.txt'), 'utf8');
  if (!robots.includes(`Sitemap: ${CANONICAL}sitemap.xml`) || /^Disallow:\s*\/$/m.test(robots)) errors.push('robots.txt sitemap/blocking mismatch');
  const sitemap = readFileSync(join(root, 'sitemap.xml'), 'utf8');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => decode(match[1]));
  if (!sitemap.includes('http://www.sitemaps.org/schemas/sitemap/0.9') || urls.length !== 1 || urls[0] !== CANONICAL) errors.push('Sitemap must contain the primary homepage only');
  const vercel = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
  if (vercel.redirects?.some(rule => rule.source === '/(.*)') || vercel.rewrites?.some(rule => rule.source === '/(.*)' && rule.destination === '/index.html')) errors.push('Vercel catch-all hides a real 404');
  const manifest = JSON.parse(readFileSync(join(root, 'site.webmanifest'), 'utf8'));
  for (const key of ['start_url', 'scope']) if (manifest[key] !== './') errors.push(`Manifest ${key} must support both publication bases`);
  const css = readFileSync(join(root, 'assets/css/site.css'), 'utf8');
  for (const match of css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]+))\s*\)/gi)) {
    const reference = match[1] ?? match[2] ?? match[3];
    if (/^#/.test(reference)) continue;
    for (const base of [CANONICAL, 'https://secondary.invalid/']) {
      try { const local = localReference(reference, 'assets/css/site.css', base, root); if (local && !existsSync(local.path)) errors.push('CSS references a missing local asset'); } catch { errors.push('Invalid CSS asset URL'); }
    }
  }
  const image = readFileSync(join(root, 'assets/images/portrait.webp'));
  if (image.subarray(0, 4).toString() !== 'RIFF' || image.subarray(8, 12).toString() !== 'WEBP') errors.push('Portrait is not a WebP asset');
  const script = readFileSync(join(root, 'assets/js/site.js'), 'utf8');
  if (!script.includes('../images/portrait.webp') || !script.includes('document.currentScript.src')) errors.push('Portrait URL must resolve from the script for both hosts');
  const git = spawnSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' });
  if (git.status !== 0) throw new Error('Cannot enumerate repository source files.');
  let checked = 0;
  for (const name of [...new Set(git.stdout.split('\0').filter(Boolean))]) {
    if (/(?:^|\/)\.env(?:\..+)?$/.test(name) && !name.endsWith('.env.example')) errors.push(`${name}: tracked environment file`);
    if (/\.(?:zip|sqlite3?|db|pem|p12|pfx)$/i.test(name)) errors.push(`${name}: archive/database/credential container requires review`);
    const bytes = readFileSync(join(root, name));
    if (bytes.includes(0)) continue;
    checked++;errors.push(...inspectSource(bytes.toString('utf8'), name));
    if (/\.(?:mjs|js)$/.test(name)) {
      const syntax = spawnSync(process.execPath, ['--check', join(root, name)], { encoding: 'utf8' });
      if (syntax.status !== 0) errors.push(`${name}: invalid JavaScript syntax`);
    }
  }
  return { errors: [...new Set(errors)], checked };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const result = checkSite();
  if (result.errors.length) { for (const error of result.errors) console.error(`ERROR: ${error}`); process.exit(1); }
  console.log(`Static checks passed: ${result.checked} source files, both publication bases, links/assets/SEO/JSON-LD/404, JS syntax and credential scan.`);
}
