import assert from 'node:assert/strict';
import { toIO } from './datasets.js';
import { parseIO } from './io/runtime.js';

// The IO parser returns dates as full ISO timestamps; the source records keep
// them as YYYY-MM-DD. Compare both on the date part.
const MIDNIGHT_UTC = /^(\d{4}-\d{2}-\d{2})T00:00:00(?:\.000)?Z$/;

function canonical(value) {
  if (typeof value === 'string') return value.replace(MIDNIGHT_UTC, '$1');
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => [k, canonical(v)])
    );
  }
  return value;
}

/**
 * Parses the generated IO text with the official parser and asserts that the
 * result equals the source records. Throws on the first mismatch.
 */
export function verifyRoundTrip(dataset, records, ioText = toIO(dataset, records)) {
  const parsed = parseIO(ioText);
  // Parsed dates are Date objects; the JSON round-trip turns them into ISO strings.
  const actual = canonical(JSON.parse(JSON.stringify(Array.isArray(parsed) ? parsed : [parsed])));
  const expected = canonical(JSON.parse(JSON.stringify(records)));
  assert.equal(actual.length, expected.length, `${dataset.id}: record count differs`);
  for (let i = 0; i < expected.length; i++) {
    assert.deepEqual(actual[i], expected[i], `${dataset.id}: record ${i} differs after IO round-trip`);
  }
}
