import assert from 'node:assert/strict';
import { test } from 'node:test';
import { encodeRow, headerOf, inferShape, isFlat } from '../src/real/infer.js';
import { verifyRoundTrip } from '../src/verify.js';

const sample = [
  { id: 'a1', score: 4.5, ok: true, tags: ['x', 'y z'], owner: { name: 'Ann, Lee', team: 'core' }, items: [{ sku: 'S1', qty: 2 }, { sku: 'S2', qty: 1 }] },
  { id: 'b2', score: 10, ok: false, tags: [], owner: { name: "O'Neil", team: '#ops' }, items: [] },
  { id: 'c3', score: -0.5, ok: true, tags: ['q'], owner: { name: '2010.', team: 'core' }, items: [{ sku: 'S9', qty: 7 }] },
];

test('infers a header with nested objects, scalar arrays and arrays of objects', () => {
  const fields = inferShape(sample);
  assert.equal(headerOf(fields), 'id, score, ok, tags, owner: {name, team}, items: [{sku, qty}]');
  assert.equal(isFlat(fields), false);
  assert.equal(isFlat(inferShape([{ a: 1, b: 'x' }])), true);
});

test('inferred schema and rows survive the official parser', () => {
  const fields = inferShape(sample);
  const dataset = { id: 'sample', ioHeader: headerOf(fields), ioRow: (r) => encodeRow(r, fields) };
  verifyRoundTrip(dataset, sample);
});

test('non-uniform or null data is rejected rather than silently mangled', () => {
  assert.throws(() => inferShape([{ a: 1 }, { b: 2 }]), /same keys/);
  assert.throws(() => inferShape([{ a: 1 }, { a: null }]), /null/);
});
