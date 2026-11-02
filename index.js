#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { DATASETS, generate } from './src/datasets.js';
import { FORMATS } from './src/formats.js';
import { speedToMarkdown, toConsole, toMarkdown } from './src/report.js';
import { runBenchmark } from './src/run.js';
import { runSpeed } from './src/speed.js';
import { runValidation, validationDatasets, validationToMarkdown } from './src/validation.js';
import { loadTokenizers, saveTokenCache } from './src/tokenizers.js';

const HELP = `Internet Object vs JSON benchmark

Usage: npm start -- [options]

Options:
  -c, --counts <n,n,...>      Record counts to run            (default: 1,10,100,1000)
  -d, --datasets <id,...>     ${Object.keys(DATASETS).join(', ')}  (default: all)
  -f, --formats <id,...>      ${FORMATS.map((f) => f.id).join(', ')}  (default: all)
  -t, --tokenizers <id,...>   Tokenizers to use               (default: all available)
  -s, --seed <n>              Seed for reproducible data      (default: 2026)
      --speed [n]             Also measure serialize/parse speed on n records (default: 1000)
      --validation [n]        Also measure validation speed (JSON Schema/Ajv vs IO schema) on n records (default: 1000)
  -o, --out <dir>             Write latest.json and latest.md to <dir>
      --save-data <dir>       Write sample data files (one per format) to <dir>
      --list                  List datasets, formats and tokenizers, then exit
  -h, --help                  Show this help

Environment:
  ANTHROPIC_API_KEY           Enables exact Claude token counts (cached in results/token-cache.json)
  ANTHROPIC_MODEL             Claude model used for counting   (default: claude-sonnet-5-5)
  HF_TOKEN                    Enables gated Hugging Face tokenizers
`;

const { values } = parseArgs({
  options: {
    counts: { type: 'string', short: 'c', default: '1,10,100,1000' },
    datasets: { type: 'string', short: 'd' },
    formats: { type: 'string', short: 'f' },
    tokenizers: { type: 'string', short: 't' },
    seed: { type: 'string', short: 's', default: '2026' },
    speed: { type: 'string' },
    validation: { type: 'string' },
    out: { type: 'string', short: 'o' },
    'save-data': { type: 'string' },
    list: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
  allowPositionals: false,
});

const fail = (message) => {
  console.error(`error: ${message}\n\nRun with --help for usage.`);
  process.exit(1);
};
const csv = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);
const positiveInt = (s, name) => {
  const n = Number(s);
  if (!Number.isInteger(n) || n < 1) fail(`${name} must be a positive integer, got "${s}"`);
  return n;
};
function select(requested, available, kind) {
  if (!requested) return available;
  const ids = csv(requested);
  const unknown = ids.filter((id) => !available.some((a) => a.id === id));
  if (unknown.length) fail(`unknown ${kind}: ${unknown.join(', ')} (available: ${available.map((a) => a.id).join(', ')})`);
  return available.filter((a) => ids.includes(a.id));
}

if (values.help) {
  console.log(HELP);
  process.exit(0);
}

const allTokenizers = await loadTokenizers();

if (values.list) {
  console.log('Datasets:\n' + Object.values(DATASETS).map((d) => `  ${d.id.padEnd(10)} ${d.label}`).join('\n'));
  console.log('\nFormats:\n' + FORMATS.map((f) => `  ${f.id.padEnd(12)} ${f.label}`).join('\n'));
  console.log(
    '\nTokenizers:\n' +
      allTokenizers.map((t) => `  ${t.id.padEnd(28)} ${t.available ? 'ready' : `unavailable – ${t.reason}`}`).join('\n')
  );
  process.exit(0);
}

const counts = csv(values.counts).map((c) => positiveInt(c, 'count'));
const seed = positiveInt(values.seed, 'seed');
const datasets = select(values.datasets, Object.values(DATASETS), 'dataset');
const formats = select(values.formats, FORMATS, 'format');
const requested = select(values.tokenizers, allTokenizers, 'tokenizer');
const tokenizers = requested.filter((t) => t.available);
for (const t of requested.filter((t) => !t.available)) console.warn(`skipping tokenizer "${t.id}": ${t.reason}`);
if (!formats.some((f) => f.id === 'json')) fail('the "json" format is required as the comparison baseline');

const results = await runBenchmark({ datasets, formats, counts, tokenizers, seed });
saveTokenCache();
console.log(toConsole(results));

let speedMarkdown = '';
const speedResults = [];
if (values.speed !== undefined) {
  const count = values.speed === '' ? 1000 : positiveInt(values.speed, 'speed');
  for (const dataset of datasets) {
    const speed = await runSpeed({ dataset, formats, count, seed });
    speedResults.push(speed);
    speedMarkdown += '\n' + speedToMarkdown(speed);
    console.log(speedToMarkdown(speed));
  }
}

const validationResults = [];
if (values.validation !== undefined) {
  const count = values.validation === '' ? 1000 : positiveInt(values.validation, 'validation');
  for (const dataset of validationDatasets().filter((d) => datasets.includes(d))) {
    const result = await runValidation({ dataset, count, seed });
    validationResults.push(result);
    speedMarkdown += '\n' + validationToMarkdown(result);
    console.log(validationToMarkdown(result));
  }
}

if (values.out) {
  mkdirSync(values.out, { recursive: true });
  if (speedResults.length) results.speed = speedResults;
  if (validationResults.length) results.validation = validationResults;
  writeFileSync(`${values.out}/latest.json`, JSON.stringify(results, null, 2) + '\n');
  writeFileSync(`${values.out}/latest.md`, toMarkdown(results) + speedMarkdown);
  console.log(`wrote ${values.out}/latest.json and ${values.out}/latest.md`);
}

if (values['save-data']) {
  const dir = values['save-data'];
  mkdirSync(dir, { recursive: true });
  const count = counts.at(-1);
  for (const dataset of datasets) {
    const records = generate(dataset, count, seed);
    for (const format of formats) {
      if (format.supports && !format.supports(dataset)) continue;
      const ext = { 'json-pretty': 'pretty.json', msgpack: 'msgpack' }[format.id] ?? (format.id === 'io' ? 'io' : format.id);
      writeFileSync(`${dir}/${dataset.id}.${ext}`, format.serialize(records, dataset));
    }
  }
  console.log(`saved ${count} ${datasets.map((d) => d.id).join('/')} records per format to ${dir}/`);
}
