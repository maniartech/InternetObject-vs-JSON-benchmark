// Downloads the real-world datasets used by the benchmark from the Hugging
// Face datasets-server (JSON rows, no authentication) into data/hf-cache/.
//
//   npm run fetch-data              # all sources
//   npm run fetch-data -- adult squad
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { CACHE_DIR, cachePath } from '../src/real/datasets.js';
import { SOURCES } from '../src/real/sources.js';

const PAGE = 100; // datasets-server maximum
const RAW_ROWS = 1600; // fetch extra: rows with nulls are dropped later
const wanted = process.argv.slice(2);
const sources = wanted.length ? SOURCES.filter((s) => wanted.includes(s.id)) : SOURCES;
if (wanted.length && sources.length !== wanted.length) {
  console.error(`unknown source(s). available: ${SOURCES.map((s) => s.id).join(', ')}`);
  process.exit(1);
}

async function getJson(url, tries = 8) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url);
    if (res.ok) return res.json();
    if (attempt >= tries || ![429, 500, 502, 503, 504].includes(res.status)) {
      throw new Error(`${url} -> HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    // Rate limited: honour Retry-After when present, otherwise back off (capped at 60s).
    const wait = Number(res.headers.get('retry-after')) * 1000 || Math.min(2000 * 2 ** attempt, 60_000);
    console.log(`  HTTP ${res.status}, retrying in ${Math.round(wait / 1000)}s (attempt ${attempt}/${tries - 1})`);
    await new Promise((r) => setTimeout(r, wait));
  }
}

mkdirSync(CACHE_DIR, { recursive: true });

for (const source of sources) {
  const { dataset, config, split } = source.hf;
  const info = await getJson(`https://huggingface.co/api/datasets/${dataset}`);
  const license = (info.tags ?? []).find((t) => t.startsWith('license:'))?.slice(8) ?? 'unknown';
  if (info.gated) throw new Error(`${dataset} is gated; skipping is the only option without a token`);

  const rows = [];
  for (let offset = 0; offset < RAW_ROWS; offset += PAGE) {
    const url = `https://datasets-server.huggingface.co/rows?dataset=${dataset}&config=${config}&split=${split}&offset=${offset}&length=${PAGE}`;
    const page = await getJson(url);
    rows.push(...page.rows.map((r) => source.project(r.row))); // keep only the columns the benchmark uses
    if (page.rows.length < PAGE) break;
  }

  const meta = {
    dataset,
    config,
    split,
    license,
    revision: info.sha,
    fetchedAt: new Date().toISOString(),
    url: `https://huggingface.co/datasets/${dataset}`,
    rawRows: rows.length,
    sha256: createHash('sha256').update(JSON.stringify(rows)).digest('hex'),
  };
  writeFileSync(cachePath(source), JSON.stringify({ meta, rows }));
  console.log(`${source.id.padEnd(11)} ${String(rows.length).padStart(5)} rows  ${license.padEnd(14)} ${dataset}@${info.sha.slice(0, 8)}`);
}
