import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { Bench } from 'tinybench';
import { DATASETS, generate } from './datasets.js';
import { document } from './io/encode.js';
import { io, parseIO } from './io/runtime.js';

// Validation benchmark: the same constraints expressed as a JSON Schema
// (checked with Ajv, the de-facto JSON Schema validator, compiled once) and as
// a typed Internet Object schema (checked by the IO parser as it reads).
//
// Not identical work, and worth saying so:
//   * IO validates *while parsing* and also converts values (e.g. `date` becomes a
//     Date); JSON.parse + Ajv leaves ISO strings as strings.
//   * IO's JS-object path (`validateCollection`) is the closest like-for-like to
//     Ajv on already-parsed data.
// Only the `users` and `metrics` datasets have schemas here.

const ajv = addFormats(new Ajv({ strict: true }));

export const SCHEMAS = {
  users: {
    json: {
      type: 'object',
      required: ['name', 'age', 'gender', 'joiningDt', 'address', 'colors', 'isActive'],
      additionalProperties: false,
      properties: {
        name: { type: 'string', minLength: 1 },
        age: { type: 'integer', minimum: 18, maximum: 65 },
        gender: { enum: ['f', 'm'] },
        joiningDt: { type: 'string', format: 'date' },
        address: {
          type: 'object',
          required: ['street', 'city'],
          additionalProperties: false,
          properties: {
            street: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string', minLength: 2, maxLength: 2 },
          },
        },
        colors: { type: 'array', items: { type: 'string' } },
        isActive: { type: 'boolean' },
      },
    },
    // IO's `date` type holds a Date, so in-memory IO validation needs Dates, not ISO strings.
    toIOObject: (r) => ({ ...r, joiningDt: new Date(r.joiningDt) }),
    ioHeader:
      'name: {string, minLen: 1}, age: {int, min: 18, max: 65}, gender: {string, choices: [f, m]}, joiningDt: date, ' +
      'address: {street: string, city: string, state?: {string, len: 2}}, colors: [string], isActive: bool',
  },
  metrics: {
    json: {
      type: 'object',
      required: ['ts', 'host', 'cpu', 'mem', 'reqs', 'ok'],
      additionalProperties: false,
      properties: {
        ts: { type: 'string' },
        host: { type: 'string' },
        cpu: { type: 'number', minimum: 0, maximum: 100 },
        mem: { type: 'number', minimum: 0, maximum: 100 },
        reqs: { type: 'integer', minimum: 0 },
        ok: { type: 'boolean' },
      },
    },
    ioHeader: 'ts: string, host: string, cpu: {number, min: 0, max: 100}, mem: {number, min: 0, max: 100}, reqs: {int, min: 0}, ok: bool',
  },
};

/** Records that break exactly one rule, for correctness tests. */
export const FAULTS = {
  users: [
    { name: 'age below minimum', mutate: (r) => ({ ...r, age: 7 }) },
    { name: 'age is not an integer', mutate: (r) => ({ ...r, age: 'thirty' }) },
    { name: 'gender outside choices', mutate: (r) => ({ ...r, gender: 'x' }) },
    { name: 'impossible date', mutate: (r) => ({ ...r, joiningDt: '2021-13-45' }) },
    { name: 'state wrong length', mutate: (r) => ({ ...r, address: { ...r.address, state: 'Texas' } }) },
    { name: 'empty name', mutate: (r) => ({ ...r, name: '' }) },
  ],
  metrics: [
    { name: 'cpu above maximum', mutate: (r) => ({ ...r, cpu: 140.5 }) },
    { name: 'cpu is not a number', mutate: (r) => ({ ...r, cpu: 'high' }) },
    { name: 'negative request count', mutate: (r) => ({ ...r, reqs: -3 }) },
    { name: 'reqs is not an integer', mutate: (r) => ({ ...r, reqs: 12.5 }) },
  ],
};

/** Builds both validators for a dataset. Compilation happens once, up front. */
export function createValidators(dataset) {
  const schema = SCHEMAS[dataset.id];
  if (!schema) throw new Error(`no validation schema for dataset "${dataset.id}"`);
  const check = ajv.compile(schema.json);
  const defs = io.parseDefinitions(`~ $schema: { ${schema.ioHeader} }`);
  const typedDoc = (rows) => document(schema.ioHeader, rows);
  const untypedDoc = (rows) => document(dataset.ioHeader, rows);
  return {
    /** Ajv on already-parsed objects. Returns true when every record is valid. */
    ajvRecords: (records) => records.every((r) => check(r)),
    /** Ajv on one record, with the first error message. */
    ajvOne: (record) => (check(record) ? null : `${check.errors[0].instancePath || '/'} ${check.errors[0].message}`),
    /** Maps parsed records to the shapes IO's typed schema expects (untimed). */
    prepareIO: (records) => records.map(schema.toIOObject ?? ((r) => r)),
    /** IO schema check of prepared objects (see `prepareIO`); no text involved. */
    ioRecords: (prepared) => io.validateCollection(prepared, defs).valid,
    /** IO parse of typed text: validation happens as part of reading. */
    ioText: (text) => parseIO(text),
    /** IO validation error for typed text, or null if the text is valid. */
    ioTextError(text) {
      try {
        parseIO(text);
        return null;
      } catch (err) {
        return err.message;
      }
    },
    typedDoc,
    untypedDoc,
  };
}

/**
 * Measures validation throughput (documents per second, each of `count`
 * records) for each scenario on one dataset.
 */
export async function runValidation({ dataset, count, seed, time = 300 }) {
  const v = createValidators(dataset);
  const records = generate(dataset, count, seed);
  const rows = records.map(dataset.ioRow);
  const jsonText = JSON.stringify(records);
  const ioTyped = v.typedDoc(rows);
  const ioUntyped = v.untypedDoc(rows);

  // Sanity: every scenario must accept the valid data before it is timed.
  if (!v.ajvRecords(records)) throw new Error('Ajv rejected the generated records');
  const prepared = v.prepareIO(records);
  if (!v.ioRecords(prepared)) throw new Error('IO rejected the generated records');
  v.ioText(ioTyped);

  const scenarios = [
    { group: 'Text → validated data', id: 'json-ajv', label: 'JSON.parse + Ajv', fn: () => v.ajvRecords(JSON.parse(jsonText)) },
    { group: 'Text → validated data', id: 'io-typed', label: 'IO parse (typed schema)', fn: () => v.ioText(ioTyped) },
    { group: 'Text → data, no validation', id: 'json-parse', label: 'JSON.parse', fn: () => JSON.parse(jsonText) },
    { group: 'Text → data, no validation', id: 'io-untyped', label: 'IO parse (untyped header)', fn: () => v.ioText(ioUntyped) },
    { group: 'Objects → validated', id: 'ajv', label: 'Ajv (compiled)', fn: () => v.ajvRecords(records) },
    { group: 'Objects → validated', id: 'io-validate', label: 'IO validateCollection', fn: () => v.ioRecords(prepared) },
  ];

  const bench = new Bench({ time, warmupTime: 100 });
  for (const s of scenarios) bench.add(s.id, s.fn);
  await bench.run();
  const throughput = new Map(bench.tasks.map((t) => [t.name, t.result?.throughput?.mean]));

  return {
    dataset: dataset.id,
    datasetLabel: dataset.label,
    count,
    rows: scenarios.map(({ group, id, label }) => ({ group, id, label, opsPerSec: throughput.get(id) })),
  };
}

export const validationDatasets = () => Object.keys(SCHEMAS).map((id) => DATASETS[id]);

const COUNTERPART = { 'io-typed': 'json-ajv', 'io-untyped': 'json-parse', 'io-validate': 'ajv' };

/** Slowdown of IO relative to its JSON counterpart, or null for JSON rows. */
export function slowdown(rows, id) {
  const base = rows.find((r) => r.id === COUNTERPART[id]);
  return base ? base.opsPerSec / rows.find((r) => r.id === id).opsPerSec : null;
}

/** How much slower validated reading is than unvalidated reading, per ecosystem. */
export function validationOverhead(rows) {
  const ops = (id) => rows.find((r) => r.id === id).opsPerSec;
  return { json: ops('json-parse') / ops('json-ajv'), io: ops('io-untyped') / ops('io-typed') };
}

export function validationToMarkdown(result) {
  const fmt = new Intl.NumberFormat('en-US');
  const lines = [
    `### Validation — ${fmt.format(result.count)} ${result.datasetLabel} records (documents per second, higher is better)`,
    '',
    '| Scenario | Validator | Docs/sec | IO vs JSON counterpart |',
    '| --- | --- | ---: | ---: |',
  ];
  for (const r of result.rows) {
    const s = slowdown(result.rows, r.id);
    lines.push(`| ${r.group} | ${r.label} | ${fmt.format(Math.round(r.opsPerSec))} | ${s ? `${s.toFixed(1)}× slower` : '–'} |`);
  }
  const o = validationOverhead(result.rows);
  lines.push('', `Cost of validating while reading: JSON.parse + Ajv is ${o.json.toFixed(2)}× the time of JSON.parse alone; IO with a typed schema is ${o.io.toFixed(2)}× the time of IO with an untyped header.`);
  return lines.join('\n') + '\n';
}
