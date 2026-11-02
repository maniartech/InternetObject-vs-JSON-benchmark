import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DATASETS, generate } from '../src/datasets.js';
import { FAULTS, SCHEMAS, createValidators } from '../src/validation.js';

const ids = Object.keys(SCHEMAS);

test('generated records are valid under both the JSON Schema and the IO schema', () => {
  for (const id of ids) {
    const dataset = DATASETS[id];
    const v = createValidators(dataset);
    const records = generate(dataset, 300, 11);
    assert.equal(v.ajvRecords(records), true, `${id}: Ajv`);
    assert.equal(v.ioRecords(v.prepareIO(records)), true, `${id}: IO validateCollection`);
    assert.equal(v.ioTextError(v.typedDoc(records.map(dataset.ioRow))), null, `${id}: IO text`);
  }
});

test('both validators reject every single-rule violation', () => {
  for (const id of ids) {
    const dataset = DATASETS[id];
    const v = createValidators(dataset);
    const [good] = generate(dataset, 1, 3);
    for (const fault of FAULTS[id]) {
      const bad = fault.mutate(good);
      assert.notEqual(v.ajvOne(bad), null, `${id}: Ajv accepted "${fault.name}"`);
      assert.equal(v.ioRecords(v.prepareIO([bad])), false, `${id}: IO validateCollection accepted "${fault.name}"`);
      assert.notEqual(v.ioTextError(v.typedDoc([dataset.ioRow(bad)])), null, `${id}: IO text accepted "${fault.name}"`);
    }
  }
});

test('one bad record among many is reported by both validators', () => {
  const dataset = DATASETS.users;
  const v = createValidators(dataset);
  const records = generate(dataset, 200, 5);
  records[137] = FAULTS.users[0].mutate(records[137]);
  assert.equal(v.ajvRecords(records), false);
  assert.equal(v.ioRecords(v.prepareIO(records)), false);
  assert.notEqual(v.ioTextError(v.typedDoc(records.map(dataset.ioRow))), null);
});

test('optional fields stay optional in both schemas', () => {
  const dataset = DATASETS.users;
  const v = createValidators(dataset);
  const [record] = generate(dataset, 1, 9);
  const noState = { ...record, address: { street: record.address.street, city: record.address.city } };
  assert.equal(v.ajvOne(noState), null);
  assert.equal(v.ioRecords(v.prepareIO([noState])), true);
  assert.equal(v.ioTextError(v.typedDoc([dataset.ioRow(noState)])), null);
});

test('IO errors carry a code and a position', () => {
  const dataset = DATASETS.users;
  const v = createValidators(dataset);
  const [good] = generate(dataset, 1, 3);
  const message = v.ioTextError(v.typedDoc([dataset.ioRow(FAULTS.users[0].mutate(good))]));
  assert.match(message, /mismatched-min/);
  assert.match(message, /at \d+:\d+/);
});
