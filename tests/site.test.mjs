import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { CANONICAL, inspectHtml, inspectSource, localReference } from '../scripts/check-site.mjs';

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

test('drawer isolates the background, traps Tab, closes with Escape and restores focus', () => {
  const app = runtime();
  app.trigger.focus();app.trigger.click();
  assert.equal(app.drawer.inert, false);
  assert.equal(app.background.inert, true);
  assert.equal(app.select.value, 'Storia');
  assert.equal(app.document.activeElement, app.name);
  app.last.focus();let prevented = false;
  app.handlers.get('keydown')({ key: 'Tab', shiftKey: false, preventDefault: () => { prevented = true; } });
  assert.ok(prevented);assert.equal(app.document.activeElement, app.close);
  app.handlers.get('keydown')({ key: 'Tab', shiftKey: true, preventDefault: () => {} });
  assert.equal(app.document.activeElement, app.last);
  app.handlers.get('keydown')({ key: 'Escape', preventDefault: () => {} });
  assert.equal(app.drawer.inert, true);assert.equal(app.background.inert, false);
  assert.equal(app.document.activeElement, app.trigger);
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
  assert.match(frames[0], /src="https:\/\/usa-memory-atlas\.vercel\.app\/"/);
  assert.equal([...html.matchAll(/data-local-article="\d"/g)].length, 6);
  assert.equal([...html.matchAll(/class="article-select(?: active)?"/g)].length, 6);
  assert.match(html, /data-local-article="1"\s*>/);
  assert.match(html, /assets\/images\/figma-home-light\.png/);
  assert.match(frames[1], /src="https:\/\/riccardobuzzolan\.notion\.site\/ebd\/368f6793082c8139bd90dc2d61e1a6af"/);
  assert.match(frames[1], /id="externalPreview5"/);
  assert.doesNotMatch(html, /class="notion-local(?:-grid|-details)?"/);
  assert.doesNotMatch(html, /<iframe[^>]*(?:substack\.com|figma\.com)/);
  assert.doesNotMatch(html, /id="(?:substackFrame|externalPreview[234])"/);
  assert.match(source, /articlePreviews\.forEach/);
  assert.match(source, /panel\.hidden=i!==index/);
});
