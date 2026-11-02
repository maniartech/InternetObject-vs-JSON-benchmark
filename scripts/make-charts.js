// Draws the README charts as standalone SVGs from results/latest.json:
//
//   npm run bench && npm run charts
//
// The SVGs are transparent and carry their own light/dark styling
// (prefers-color-scheme), so a single file works on both GitHub themes.
// Palette: first three categorical slots of the reference data-viz palette,
// validated all-pairs for colour-vision deficiency in both modes. Every bar and
// point also carries a direct value label, so colour is never the only cue.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const results = JSON.parse(readFileSync(new URL('../results/latest.json', import.meta.url), 'utf8'));
const outDir = new URL('../docs/charts/', import.meta.url);
mkdirSync(outDir, { recursive: true });

const HEADLINE = 1000;
const PRIMARY_TOKENIZER = 'o200k_base';
const W = 760;
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';

const DATASETS = [
  { id: 'users', name: 'Users (nested)', cls: 's1' },
  { id: 'orders', name: 'Orders (array of objects)', cls: 's2' },
  { id: 'metrics', name: 'Metrics (flat)', cls: 's3' },
];

const STYLE = `
  .t1{fill:#0b0b0b}.t2{fill:#52514e}.grid{stroke:#d9d8d3}.axis{stroke:#8a8985}
  .other{fill:#9a9992}.s1{fill:#2a78d6}.s2{fill:#eb6834}.s3{fill:#1baf7a}
  .halo{paint-order:stroke;stroke-width:4px;stroke-linejoin:round}
  .l1{stroke:#2a78d6}.l2{stroke:#eb6834}.l3{stroke:#1baf7a}.ring{stroke:#ffffff}
  @media (prefers-color-scheme: dark){
    .t1{fill:#f0efec}.t2{fill:#c3c2b7}.grid{stroke:#383835}.axis{stroke:#77766f}
    .other{fill:#77766f}.s1{fill:#3987e5}.s2{fill:#d95926}.s3{fill:#199e70}
    .l1{stroke:#3987e5}.l2{stroke:#d95926}.l3{stroke:#199e70}.ring{stroke:#0d1117}
  }`;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const pct = (v, d = 1) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(d)}%`;
const change = (value, base) => ((value - base) / base) * 100;
const row = (run, id) => run.rows.find((r) => r.id === id);
const runOf = (dataset, count) => results.runs.find((r) => r.dataset === dataset && r.count === count);
const tokenizers = results.tokenizers;

function svg({ height, title, desc, body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${height}" width="${W}" height="${height}" role="img" aria-labelledby="t d" font-family='${FONT}'>
<title id="t">${esc(title)}</title><desc id="d">${esc(desc)}</desc>
<style>${STYLE}</style>
${body}
</svg>
`;
}

const text = (x, y, s, { cls = 't2', size = 12, anchor = 'start', weight = 400 } = {}) =>
  `<text x="${x}" y="${y}" class="${cls}" font-size="${size}" text-anchor="${anchor}" font-weight="${weight}">${esc(s)}</text>`;

/** Legend row: one swatch per series, always present for 2+ series. */
function legend(items, x, y) {
  let cursor = x;
  return items
    .map(({ name, cls }) => {
      const out = `<rect x="${cursor}" y="${y - 9}" width="10" height="10" rx="2" class="${cls}"/>` + text(cursor + 15, y, name, { size: 12 });
      cursor += 15 + name.length * 6.6 + 22;
      return out;
    })
    .join('');
}

// ---- 1. Tokens by format, per dataset (horizontal bars) ----------------------

function tokensByFormat() {
  const tok = PRIMARY_TOKENIZER;
  const tokLabel = tokenizers.find((t) => t.id === tok).label;
  const domain = [-60, 80];
  const left = 150, right = W - 70, rowH = 26, gap = 34, top = 64;
  const x = (v) => left + ((v - domain[0]) / (domain[1] - domain[0])) * (right - left);
  let y = top, body = '';
  body += text(24, 28, `Tokens vs minified JSON, ${HEADLINE.toLocaleString('en-US')} records (${tokLabel})`, { cls: 't1', size: 16, weight: 600 });
  body += text(24, 48, 'Shorter bar to the left is better. Internet Object highlighted.', { size: 12 });

  for (const ds of DATASETS) {
    const run = runOf(ds.id, HEADLINE);
    const base = row(run, 'json').tokens[tok];
    const rows = run.rows
      .filter((r) => r.id !== 'msgpack')
      .map((r) => ({ id: r.id, label: r.label, v: change(r.tokens[tok], base) }));
    body += text(24, y + 12, ds.name, { cls: 't1', size: 13, weight: 600 });
    y += 22;
    const panelTop = y;
    for (const r of rows) {
      const isIO = r.id === 'io', isBase = r.id === 'json';
      const x0 = x(0), x1 = x(r.v);
      body += text(left - 10, y + 15, r.label, { anchor: 'end', cls: isIO ? 't1' : 't2', weight: isIO ? 600 : 400 });
      if (!isBase) {
        const bx = Math.min(x0, x1), bw = Math.max(Math.abs(x1 - x0), 1);
        body += `<rect x="${bx}" y="${y + 4}" width="${bw}" height="14" rx="3" class="${isIO ? 's1' : 'other'}"/>`;
      }
      const lx = r.v >= 0 ? x1 + 6 : x1 - 6;
      body += text(isBase ? x0 + 6 : lx, y + 15, isBase ? 'baseline' : pct(r.v), { anchor: r.v >= 0 || isBase ? 'start' : 'end', cls: isIO ? 't1' : 't2', weight: isIO ? 600 : 400 });
      y += rowH;
    }
    body += `<line x1="${x(0)}" x2="${x(0)}" y1="${panelTop - 2}" y2="${y}" class="axis" stroke-width="1"/>`;
    y += gap - 10;
  }
  return svg({
    height: y + 4,
    title: `Token count versus minified JSON at ${HEADLINE} records`,
    desc: 'Horizontal bars per dataset showing each format’s token count relative to minified JSON.',
    body,
  });
}

// ---- 2. Scaling with record count (lines) ------------------------------------

function scaling() {
  const tok = PRIMARY_TOKENIZER;
  const tokLabel = tokenizers.find((t) => t.id === tok).label;
  const counts = [...new Set(results.runs.map((r) => r.count))].sort((a, b) => a - b);
  const left = 64, right = W - 150, top = 84, bottom = 300, height = 350;
  const domain = [-40, 20];
  const x = (i) => left + (i / (counts.length - 1)) * (right - left);
  const y = (v) => top + ((domain[1] - v) / (domain[1] - domain[0])) * (bottom - top);
  let body = text(24, 28, `When does Internet Object start paying off? (${tokLabel})`, { cls: 't1', size: 16, weight: 600 });
  body += text(24, 48, 'Token change vs minified JSON as the record count grows. Below the zero line is better.', { size: 12 });
  body += legend(DATASETS, 24, 70);

  for (const v of [-40, -30, -20, -10, 0, 10, 20]) {
    body += `<line x1="${left}" x2="${right}" y1="${y(v)}" y2="${y(v)}" class="${v === 0 ? 'axis' : 'grid'}" stroke-width="${v === 0 ? 1.5 : 1}"/>`;
    body += text(left - 8, y(v) + 4, v === 0 ? '0%' : pct(v, 0), { anchor: 'end', size: 11 });
  }
  counts.forEach((c, i) => {
    body += text(x(i), bottom + 22, c.toLocaleString('en-US'), { anchor: 'middle', size: 11 });
  });
  body += text((left + right) / 2, bottom + 44, 'records', { anchor: 'middle', size: 12 });

  DATASETS.forEach((ds, k) => {
    const pts = counts.map((c, i) => {
      const run = runOf(ds.id, c);
      return { px: x(i), v: change(row(run, 'io').tokens[tok], row(run, 'json').tokens[tok]) };
    });
    body += `<polyline fill="none" class="l${k + 1}" stroke-width="2" stroke-linejoin="round" points="${pts.map((p) => `${p.px},${y(p.v)}`).join(' ')}"/>`;
    for (const p of pts) body += `<circle cx="${p.px}" cy="${y(p.v)}" r="4.5" class="${ds.cls} ring" stroke-width="2"/>`;
  });

  // Value labels sit to the right of each point; labels in the same column are
  // pushed apart vertically so close values (e.g. +10.7% / +8.9%) stay legible.
  counts.forEach((c, i) => {
    const col = DATASETS.map((ds, k) => {
      const run = runOf(ds.id, c);
      const v = change(row(run, 'io').tokens[tok], row(run, 'json').tokens[tok]);
      return { ds, k, v, ly: y(v) };
    }).sort((a, b) => a.ly - b.ly);
    for (let j = 1; j < col.length; j++) col[j].ly = Math.max(col[j].ly, col[j - 1].ly + 15);
    for (const p of col) {
      body += `<rect x="${x(i) + 11}" y="${p.ly - 4}" width="7" height="7" rx="1.5" class="${p.ds.cls}"/>`;
      body += text(x(i) + 22, p.ly + 4, pct(p.v), { size: 11, cls: 't1 ring halo' });
    }
  });
  return svg({
    height,
    title: 'Internet Object token change versus JSON by record count',
    desc: 'Line chart of Internet Object token count relative to minified JSON at 1, 10, 100 and 1000 records for three datasets.',
    body,
  });
}

// ---- 3 & 4. Grouped bars: categories × datasets ------------------------------

function groupedBars({ title, subtitle, categories, valueOf, desc, height = 380, yMax }) {
  const left = 56, right = W - 24, top = 92, bottom = height - 60;
  const all = categories.flatMap((c) => DATASETS.map((d) => valueOf(c, d)));
  const max = yMax ?? Math.ceil(Math.max(...all) / 10) * 10;
  const y = (v) => bottom - (v / max) * (bottom - top);
  const slot = (right - left) / categories.length;
  const barW = Math.min(30, (slot - 28) / DATASETS.length);
  let body = text(24, 28, title, { cls: 't1', size: 16, weight: 600 });
  body += text(24, 48, subtitle, { size: 12 });
  body += legend(DATASETS, 24, 70);
  const step = max <= 50 ? 10 : 20;
  for (let v = 0; v <= max; v += step) {
    body += `<line x1="${left}" x2="${right}" y1="${y(v)}" y2="${y(v)}" class="${v === 0 ? 'axis' : 'grid'}" stroke-width="1"/>`;
    body += text(left - 8, y(v) + 4, `${v}%`, { anchor: 'end', size: 11 });
  }
  categories.forEach((c, ci) => {
    const cx = left + slot * ci + slot / 2;
    const groupW = barW * DATASETS.length + 4 * (DATASETS.length - 1);
    DATASETS.forEach((d, di) => {
      const v = valueOf(c, d);
      const bx = cx - groupW / 2 + di * (barW + 4);
      body += `<path d="M${bx} ${bottom} V${y(v) + 4} a4 4 0 0 1 4 -4 h${barW - 8} a4 4 0 0 1 4 4 V${bottom} Z" class="${d.cls}"/>`;
      body += text(bx + barW / 2, y(v) - 6, `${v.toFixed(0)}%`, { anchor: 'middle', size: 11, cls: 't1' });
    });
    body += text(cx, bottom + 22, c.label, { anchor: 'middle', size: 12 });
  });
  return svg({ height, title, desc, body });
}

function reductionByMeasure() {
  const tok = PRIMARY_TOKENIZER;
  const tokLabel = tokenizers.find((t) => t.id === tok).label;
  const measures = [
    { label: 'Bytes', get: (r) => r.bytes },
    { label: 'gzip', get: (r) => r.gzip },
    { label: 'brotli', get: (r) => r.brotli },
    { label: `Tokens (${tokLabel})`, get: (r) => r.tokens[tok] },
  ];
  return groupedBars({
    title: 'How much smaller is Internet Object than JSON?',
    subtitle: `Reduction vs minified JSON at ${HEADLINE.toLocaleString('en-US')} records. Taller is better; compression erases most of the byte saving.`,
    categories: measures,
    valueOf: (m, d) => {
      const run = runOf(d.id, HEADLINE);
      return -change(m.get(row(run, 'io')), m.get(row(run, 'json')));
    },
    desc: 'Grouped bars of Internet Object size reduction versus JSON, for bytes, gzip, brotli and tokens, across three datasets.',
    yMax: 60,
  });
}

function reductionByTokenizer() {
  const cats = tokenizers.map((t) => ({ label: t.label, id: t.id }));
  return groupedBars({
    title: 'Token saving by model family',
    subtitle: `Internet Object vs minified JSON at ${HEADLINE.toLocaleString('en-US')} records, one exact tokenizer per family. Taller is better.`,
    categories: cats,
    valueOf: (c, d) => {
      const run = runOf(d.id, HEADLINE);
      return -change(row(run, 'io').tokens[c.id], row(run, 'json').tokens[c.id]);
    },
    desc: 'Grouped bars of Internet Object token reduction versus JSON for each tokenizer and dataset.',
    height: 380,
    yMax: 40,
  });
}

// ---- 5. Parse speed relative to JSON -----------------------------------------

function parseSpeed() {
  if (!results.speed) return null;
  const formats = [
    { id: 'msgpack', label: 'MessagePack' },
    { id: 'toon', label: 'TOON' },
    { id: 'io', label: 'Internet Object' },
    { id: 'yaml', label: 'YAML' },
  ];
  const speedOf = (dataset, id) => results.speed.find((s) => s.dataset === dataset)?.rows.find((r) => r.id === id)?.parse;
  return groupedBars({
    title: 'Parse speed relative to JSON.parse',
    subtitle: 'Operations per second as a share of JSON (JSON = 100%), 1,000 records. Taller is better. Single noisy run: indicative only.',
    categories: formats,
    valueOf: (f, d) => (speedOf(d.id, f.id) / speedOf(d.id, 'json')) * 100,
    desc: 'Grouped bars of parse throughput for MessagePack, TOON, Internet Object and YAML relative to JSON.parse.',
    yMax: 100,
  });
}

// ---- 6. Validation throughput (log-scale horizontal bars) ---------------------

function validationChart() {
  if (!results.validation) return null;
  const left = 190, right = W - 90, rowH = 24, top = 70;
  const min = 1, max = 100000;
  const x = (v) => left + ((Math.log10(v) - Math.log10(min)) / (Math.log10(max) - Math.log10(min))) * (right - left);
  const fmt = new Intl.NumberFormat('en-US');
  let y = top, body = text(24, 28, 'Validation throughput: JSON Schema (Ajv) vs Internet Object', { cls: 't1', size: 16, weight: 600 });
  body += text(24, 48, 'Documents per second of 1,000 records, log scale, longer is faster. Internet Object highlighted.', { size: 12 });
  for (const result of results.validation) {
    body += text(24, y + 12, `${result.datasetLabel.replace(/ \(.*\)/, '')} — ${result.count.toLocaleString('en-US')} records`, { cls: 't1', size: 13, weight: 600 });
    y += 22;
    const panelTop = y;
    let lastGroup = '';
    for (const r of result.rows) {
      if (r.group !== lastGroup) {
        lastGroup = r.group;
        body += text(left - 10, y + 12, r.group, { anchor: 'end', size: 10 });
        y += 14;
      }
      const isIO = r.id.startsWith('io');
      body += text(left - 10, y + 15, r.label, { anchor: 'end', cls: isIO ? 't1' : 't2', weight: isIO ? 600 : 400 });
      body += `<rect x="${left}" y="${y + 4}" width="${Math.max(x(r.opsPerSec) - left, 1)}" height="14" rx="3" class="${isIO ? 's1' : 'other'}"/>`;
      body += text(x(r.opsPerSec) + 6, y + 15, fmt.format(Math.round(r.opsPerSec)), { cls: isIO ? 't1' : 't2', weight: isIO ? 600 : 400 });
      y += rowH;
    }
    body += `<line x1="${left}" x2="${left}" y1="${panelTop - 2}" y2="${y}" class="axis" stroke-width="1"/>`;
    y += 22;
  }
  for (const v of [1, 10, 100, 1000, 10000, 100000]) body += text(x(v), y, fmt.format(v), { anchor: 'middle', size: 10 });
  return svg({
    height: y + 14,
    title: 'Validation throughput, JSON Schema versus Internet Object',
    desc: 'Log-scale horizontal bars of documents per second for six validation scenarios on two datasets.',
    body,
  });
}

const charts = {
  'validation.svg': validationChart(),
  'tokens-by-format.svg': tokensByFormat(),
  'scaling.svg': scaling(),
  'reduction-by-measure.svg': reductionByMeasure(),
  'tokenizers.svg': reductionByTokenizer(),
  'parse-speed.svg': parseSpeed(),
};
for (const [name, content] of Object.entries(charts)) {
  if (!content) continue;
  writeFileSync(new URL(name, outDir), content);
  console.log(`wrote docs/charts/${name}`);
}
