import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { CANONICAL, attributes, inspectHtml, inspectSource, localReference } from '../scripts/check-site.mjs';

const source = readFileSync(new URL('../assets/js/site.js', import.meta.url), 'utf8');

function runtime({ failedPortrait = false } = {}) {
  const handlers = new Map();
  const document = { activeElement: null, hidden: false, body: { style: {} }, currentScript: { src: `${CANONICAL}assets/js/site.js` }, addEventListener: () => {} };
  function element() {
    const classes = new Set();
    return { inert: false, hidden: false, dataset: {},
      classList: { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name), toggle: (name, force) => force ? classes.add(name) : classes.delete(name) },
      attrs: {}, setAttribute(name, value) { this.attrs[name] = value; },
      addEventListener(name, callback) { this[name] = callback; },
      focus() { document.activeElement = this; }
    };
  }
  const drawer = element();drawer.inert = true;
  const backdrop = element();const background = element();
  const trigger = element();trigger.dataset.tutorSubject = 'Storia';
  const close = element();const name = element();const last = element();const select = element();
  const registry = { '#tutorDrawer': drawer, '#tutorDrawerBackdrop': backdrop, '#tutorSubject': select, '#tutorDrawerClose': close, '#tutorName': name };
  document.querySelector = selector => registry[selector] ?? null;
  document.querySelectorAll = selector => selector.startsWith('body >') ? [background] : selector === '[data-tutor-subject]' ? [trigger] : [];
  drawer.querySelectorAll = () => [close, name, select, last];
  const canvas = failedPortrait ? { parentElement: {}, getContext: () => ({}), hidden: false } : null;
  document.getElementById = id => id === 'stackFaceCanvas' ? canvas : null;
  let scheduled = 0;
  const context = { document, URL, console, performance: { now: () => 0 }, matchMedia: () => ({ matches: true }),
    addEventListener: (name, callback) => handlers.set(name, callback), setInterval: () => {},
    requestAnimationFrame: () => { scheduled++;return scheduled; },
    Image: class { decode() { return Promise.reject(new Error('Image unavailable')); } },
    window: {},
  };
  vm.runInNewContext(source, context);
  return { document, drawer, background, trigger, close, name, select, last, handlers, canvas, scheduled: () => scheduled };
}

test('tutoring draft follows portfolio, has no pricing cards and retains local search visibility', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const beforeFooter = html.slice(0, html.indexOf('</main>'));
  assert.ok(beforeFooter.indexOf('id="portfolio-completo"') < beforeFooter.indexOf('id="ripetizioni"'));
  assert.ok(beforeFooter.indexOf('id="ripetizioni"') < beforeFooter.indexOf('id="metodo"'));
  assert.ok(beforeFooter.indexOf('id="metodo"') < beforeFooter.indexOf('id="contatti"'));
  assert.match(html, /Sezione in lavorazione · Bozza/);
  assert.match(html, /Richiedi informazioni/);
  assert.doesNotMatch(html, /Formati illustrativi|Tariffe oscurate|Non prenotabile|Prezzi e promozioni oscurati/);
  assert.doesNotMatch(html, /class="pricing-card|id="tariffe"|href="#tariffe"/);
  assert.doesNotMatch(html, /<aside[^>]*id="tutorDrawer"|<button[^>]*data-tutor-subject=/);
  assert.doesNotMatch(html, /Chiedi disponibilità|Richiesta lezione|https:\/\/wa\.me\//);
  assert.doesNotMatch(html, /20 €|25 €|30 €|200 €|10 lezioni \+ 1 gratuita/);
  assert.doesNotMatch(source, /tutorDrawer|wa\.me\//);
  assert.match(html, /<title>Riccardo Buzzolan \| Portfolio e ripetizioni a Schio · Bozza<\/title>/);
  assert.match(html, /rel="canonical"/);
  assert.match(html, /name="description"/);
  assert.doesNotMatch(html, /(?:@type|class)="Offer"|€|https:\/\/wa\.me\//);
  assert.match(html, /index,follow/);
  const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(jsonLd);
  const schema = JSON.parse(jsonLd[1]);
  assert.ok(schema['@graph'].some(node => node['@type'] === 'CreativeWork'));
  assert.ok(!schema['@graph'].some(node => node['@type'] === 'Offer'));
});

test('failed portrait decode hides the decorative canvas without starting an animation loop', async () => {
  const app = runtime({ failedPortrait: true });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.canvas.hidden, true);
  assert.equal(app.scheduled(), 0);
});

test('relative assets resolve on Pages and on Vercel; unsafe schemes are rejected', t => {
  const root = mkdtempSync(join(tmpdir(), 'tutoring-links-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(root, 'index.html'), '<main id="main"></main>');
  for (const base of [CANONICAL, 'https://secondary.invalid/']) {
    assert.equal(localReference('./index.html#main', '404.html', base, root).path, join(root, 'index.html'));
    assert.equal(localReference('./index.html#main', '404.html', base, root).hash, 'main');
  }
  assert.throws(() => localReference('javascript:alert(1)', 'index.html', CANONICAL, root), /Unsafe/);
  assert.throws(() => localReference('../other.html', 'index.html', CANONICAL, root), /escapes/);
});

test('static gate catches invalid JSON-LD, broken fragments and missing referenced assets', t => {
  const root = mkdtempSync(join(tmpdir(), 'tutoring-html-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const html = `<!doctype html><html lang="it"><head><title>Page</title><meta name="description" content="Description"><link rel="canonical" href="${CANONICAL}"><script type="application/ld+json">{invalid}</script></head><body><main><h1>Title</h1><a href="#missing">Anchor</a><img src="missing.webp" alt=""></main></body></html>`;
  writeFileSync(join(root, 'index.html'), html);
  const errors = inspectHtml(html, 'index.html', root);
  for (const needle of ['JSON-LD', 'fragment', 'missing.webp']) assert.ok(errors.some(error => error.includes(needle)), needle);
});

test('source security reports the category and file without exposing a matched token', () => {
  const token = ['ghp', '_', 'a'.repeat(40)].join('');
  const errors = inspectSource(`const example = '${token}';\n`, 'example.js');
  assert.ok(errors.some(error => error.includes('GitHub token')));
  assert.ok(errors.every(error => !error.includes(token)));
});

test('Notion uses its genuine iframe embed and the other previews keep working', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const frames = [...html.matchAll(/<iframe\b[^>]*><\/iframe>/g)].map(match => match[0]);
  assert.equal(frames.length, 2);
  assert.match(frames[0], /data-privacy-src="https:\/\/usa-memory-atlas\.vercel\.app\/"/);
  assert.equal([...html.matchAll(/data-local-article="\d"/g)].length, 6);
  assert.equal([...html.matchAll(/class="article-select(?: active)?"/g)].length, 6);
  assert.match(html, /data-local-article="1"\s*>/);
  assert.match(html, /assets\/images\/figma-home-light\.png/);
  assert.match(frames[1], /data-privacy-src="https:\/\/riccardobuzzolan\.notion\.site\/ebd\/368f6793082c8139bd90dc2d61e1a6af"/);
  assert.match(frames[1], /id="externalPreview5"/);
  assert.doesNotMatch(html, /class="notion-local(?:-grid|-details)?"/);
  assert.doesNotMatch(html, /<iframe[^>]*(?:substack\.com|figma\.com)/);
  assert.doesNotMatch(html, /id="(?:substackFrame|externalPreview[234])"/);
  assert.match(source, /articlePreviews\.forEach/);
  assert.match(source, /panel\.hidden=i!==index/);
});

test('subject table rows keep four cells and show informational email links', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const stack = [];
  const rows = [];
  const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
  for (const match of html.matchAll(/<\/?([a-z][\w-]*)\b[^>]*>/gi)) {
    const tag = match[1].toLowerCase();
    if (match[0].startsWith('</')) {
      const index = stack.findLastIndex(node => node.tag === tag);
      if (index >= 0) stack.length = index;
      continue;
    }
    const node = { tag, attrs: attributes(match[0]), children: [] };
    stack.at(-1)?.children.push(node);
    if (node.attrs.role === 'row' && node.attrs.class?.split(/\s+/).includes('subject-table-row')) rows.push(node);
    if (!voidTags.has(tag) && !match[0].endsWith('/>')) stack.push(node);
  }
  assert.equal(rows.length, 5);
  assert.deepEqual(rows[0].children.map(cell => cell.attrs.role), ['columnheader', 'columnheader', 'columnheader', 'columnheader']);
  const subjects = ['Economia aziendale', 'Diritto', 'Storia', 'Geografia'];
  rows.slice(1).forEach((row, index) => {
    assert.deepEqual(row.children.map(cell => cell.attrs.role), ['cell', 'cell', 'cell', 'cell']);
    assert.equal(row.children[3].children.length, 1);
    const link = row.children[3].children[0];
    assert.equal(link.tag, 'a');
    assert.match(link.attrs.href, /^mailto:riccardobuzzolan96@gmail\.com\?subject=/);
    assert.ok(decodeURIComponent(link.attrs.href).includes(subjects[index]));
  });
});


test('external iframe sources are inert until consent is granted', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.equal([...html.matchAll(/<iframe\b[^>]*data-privacy-src=/g)].length, 2);
  assert.doesNotMatch(html, /<iframe\b[^>]*\ssrc="https:\/\//);
  const privacy = readFileSync(new URL('../assets/js/privacy.js', import.meta.url), 'utf8');
  assert.match(privacy, /frame\.removeAttribute\("src"\)/);
  assert.match(privacy, /localStorage\.setItem\(KEY/);
  assert.match(privacy, /siteprivacy:changed/);
});
