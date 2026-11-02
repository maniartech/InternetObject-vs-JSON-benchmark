import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DATASETS, generate, toIO } from '../src/datasets.js';
import { FORMATS } from '../src/formats.js';
import { str } from '../src/io/encode.js';
import { parseIO } from '../src/io/runtime.js';
import { runBenchmark } from '../src/run.js';
import { verifyRoundTrip } from '../src/verify.js';

const datasets = Object.values(DATASETS);

test('generation is deterministic for a given seed', () => {
  for (const d of datasets) {
    assert.deepEqual(generate(d, 50, 7), generate(d, 50, 7));
    assert.notDeepEqual(generate(d, 50, 7), generate(d, 50, 8));
  }
});

test('generated Internet Object text round-trips through the official parser', () => {
  for (const d of datasets) {
    for (const seed of [1, 2, 3]) verifyRoundTrip(d, generate(d, 500, seed));
  }
});

test('str() quotes values the parser would otherwise misread', () => {
  const tricky = ['2010.', 'Goosebumps #28', '#Acoustic', "O'Neil", '4912808N', '4183147E', '0xFF', '0b11', '1e5', 'T', 'N', 'null', 'Inf', 'a, b', ' padded', 'x:y', ''];
  for (const value of tricky) {
    const parsed = parseIO(`v\n---\n~ ${str(value)}\n`);
    assert.equal(parsed[0].v, value, `value ${JSON.stringify(value)} did not survive`);
  }
});

test('plain strings stay unquoted so IO stays compact', () => {
  for (const value of ['Alice Smith', 'f', 'm', 'tan', '5ZPR2RRO']) assert.equal(str(value), value);
});

test('byte counts are UTF-8 bytes, not UTF-16 code units', async () => {
  const [json] = FORMATS;
  const dataset = { ...DATASETS.metrics };
  const results = await runBenchmark({ datasets: [dataset], formats: [json], counts: [3], tokenizers: [], seed: 1 });
  const expected = Buffer.byteLength(json.serialize(generate(dataset, 3, 1)), 'utf8');
  assert.equal(results.runs[0].rows[0].bytes, expected);
  assert.equal(Buffer.byteLength('Zoë', 'utf8'), 4); // guards the assumption above
});

test('IO byte count covers the whole document (header, separator, ~ prefixes, newlines)', () => {
  const d = DATASETS.metrics;
  const records = generate(d, 4, 1);
  const text = toIO(d, records);
  assert.ok(text.startsWith(`${d.ioHeader}\n---\n~ `));
  assert.equal(text.split('\n').filter((l) => l.startsWith('~ ')).length, 4);
  assert.ok(text.endsWith('\n'));
});

test('CSV is only offered for flat datasets', () => {
  const csv = FORMATS.find((f) => f.id === 'csv');
  assert.equal(csv.supports(DATASETS.metrics), true);
  assert.equal(csv.supports(DATASETS.users), false);
});

test('every text format parses back to the same record count', () => {
  for (const d of datasets) {
    const records = generate(d, 25, 5);
    for (const f of FORMATS.filter((f) => f.parse && (!f.supports || f.supports(d)))) {
      const parsed = f.parse(f.serialize(records, d), d);
      assert.equal(Array.isArray(parsed) ? parsed.length : 1, 25, `${f.id} on ${d.id}`);
    }
  }
});
