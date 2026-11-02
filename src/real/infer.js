import { arr, bool, obj, str } from '../io/encode.js';

// Derives an untyped Internet Object schema header, and a matching row
// encoder, from the shape of real-world records. Records must be uniform: every
// record has the same keys, no nulls. (The projection step in sources.js
// normalizes that.) Output follows the same conventions as the hand-written
// synthetic schemas, e.g. `address: {street, city}` and `items: [{sku, qty}]`.

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function shapeOf(values, path) {
  if (values.every(isObject)) return { kind: 'object', fields: shapeOfFields(values, path) };
  if (values.every(Array.isArray)) {
    const items = values.flat();
    if (items.length && items.every(isObject)) return { kind: 'objects', fields: shapeOfFields(items, `${path}[]`) };
    if (items.every((v) => ['string', 'number', 'boolean'].includes(typeof v))) return { kind: 'array' };
    throw new Error(`${path}: arrays must hold only scalars or only objects`);
  }
  if (values.every((v) => ['string', 'number', 'boolean'].includes(typeof v))) return { kind: 'scalar' };
  throw new Error(`${path}: mixed or null values are not supported`);
}

function shapeOfFields(records, path) {
  const keys = Object.keys(records[0]);
  for (const r of records) {
    const same = Object.keys(r).length === keys.length && keys.every((k) => k in r);
    if (!same) throw new Error(`${path || 'record'}: records do not share the same keys`);
  }
  return keys.map((key) => ({ key, shape: shapeOf(records.map((r) => r[key]), `${path}.${key}`) }));
}

export function inferShape(records) {
  return shapeOfFields(records, '');
}

const fieldHeader = ({ key, shape }) => {
  if (shape.kind === 'object') return `${key}: {${shape.fields.map(fieldHeader).join(', ')}}`;
  if (shape.kind === 'objects') return `${key}: [{${shape.fields.map(fieldHeader).join(', ')}}]`;
  return key;
};

export const headerOf = (fields) => fields.map(fieldHeader).join(', ');
export const isFlat = (fields) => fields.every((f) => f.shape.kind === 'scalar');

function scalar(v) {
  if (typeof v === 'string') return str(v);
  if (typeof v === 'boolean') return bool(v);
  return String(v);
}

function encodeFields(record, fields) {
  return fields.map(({ key, shape }) => {
    const v = record[key];
    if (shape.kind === 'object') return obj(...encodeFields(v, shape.fields));
    if (shape.kind === 'objects') return arr(v.map((o) => obj(...encodeFields(o, shape.fields))));
    if (shape.kind === 'array') return arr(v.map(scalar));
    return scalar(v);
  });
}

export const encodeRow = (record, fields) => encodeFields(record, fields).join(', ');
