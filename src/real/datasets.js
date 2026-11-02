import { existsSync, readFileSync } from 'node:fs';
import { encodeRow, headerOf, inferShape, isFlat } from './infer.js';
import { MAX_ROWS, SOURCES } from './sources.js';

export const CACHE_DIR = new URL('../../data/hf-cache/', import.meta.url);
export const cachePath = (source) => new URL(`${source.id}.json`, CACHE_DIR);

const hasNull = (v) =>
  v === null || v === undefined || (Array.isArray(v) ? v.some(hasNull) : typeof v === 'object' && Object.values(v).some(hasNull));

// IO 0.3.0 reads any string that starts with `$` or `@` as a schema/variable
// reference, even when quoted, so such values cannot be written. Rows holding
// one are excluded (and counted) rather than silently altered.
const unrepresentable = (v) =>
  typeof v === 'string' ? /^[$@]/.test(v) : v && typeof v === 'object' ? Object.values(v).some(unrepresentable) : false;

/** Builds a benchmark dataset from a cached snapshot, or null if not fetched. */
function build(source) {
  const file = cachePath(source);
  if (!existsSync(file)) return null;
  const { meta, rows } = JSON.parse(readFileSync(file, 'utf8'));
  const records = [];
  let excluded = 0;
  for (const record of rows.map(source.project).filter((r) => !hasNull(r))) {
    if (records.length >= MAX_ROWS) break;
    if (unrepresentable(record)) excluded++;
    else records.push(record);
  }
  const fields = inferShape(records);
  return {
    id: source.id,
    label: source.label,
    kind: 'real',
    flat: isFlat(fields),
    source: { ...meta, note: source.note, excludedRows: excluded },
    available: records.length,
    ioHeader: headerOf(fields),
    ioRow: (record) => encodeRow(record, fields),
    // Real data is a fixed snapshot: the first `count` rows, regardless of seed.
    generate: (count) => structuredClone(records.slice(0, count)),
  };
}

export function loadRealDatasets() {
  return SOURCES.map((s) => ({ source: s, dataset: build(s) }));
}
