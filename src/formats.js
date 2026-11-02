import { encode as msgpackEncode, decode as msgpackDecode } from '@msgpack/msgpack';
import { encode as toonEncode, decode as toonDecode } from '@toon-format/toon';
import { stringify as csvStringify } from 'csv-stringify/sync';
import YAML from 'yaml';
import { toIO } from './datasets.js';
import { parseIO } from './io/runtime.js';

// A format turns a dataset's records into text (or bytes, for binary formats).
//
//   id / label  – identifiers for CLI flags and report columns
//   binary      – true when the output is not text (no token counts)
//   supports    – (dataset) => boolean; e.g. CSV cannot express nested data
//   serialize   – (records, dataset) => string | Uint8Array
//   parse       – (output, dataset) => records; used by the optional speed run

const withoutUndefined = (records) => JSON.parse(JSON.stringify(records));

export const FORMATS = [
  {
    id: 'json',
    label: 'JSON',
    serialize: (records) => JSON.stringify(records),
    parse: (out) => JSON.parse(out),
  },
  {
    id: 'json-pretty',
    label: 'JSON (pretty)',
    serialize: (records) => JSON.stringify(records, null, 2),
    parse: (out) => JSON.parse(out),
  },
  {
    id: 'ndjson',
    label: 'NDJSON',
    serialize: (records) => records.map((r) => JSON.stringify(r)).join('\n') + '\n',
    parse: (out) => out.trimEnd().split('\n').map((l) => JSON.parse(l)),
  },
  {
    id: 'csv',
    label: 'CSV',
    supports: (dataset) => dataset.flat,
    serialize: (records) => csvStringify(records, { header: true }),
  },
  {
    id: 'yaml',
    label: 'YAML',
    serialize: (records) => YAML.stringify(withoutUndefined(records)),
    parse: (out) => YAML.parse(out),
  },
  {
    id: 'toon',
    label: 'TOON',
    serialize: (records) => toonEncode(withoutUndefined(records)),
    parse: (out) => toonDecode(out),
  },
  {
    id: 'msgpack',
    label: 'MessagePack',
    binary: true,
    serialize: (records) => msgpackEncode(withoutUndefined(records)),
    parse: (out) => msgpackDecode(out),
  },
  {
    id: 'io',
    label: 'Internet Object',
    serialize: (records, dataset) => toIO(dataset, records),
    parse: (out) => parseIO(out),
  },
];

export const formatById = (id) => FORMATS.find((f) => f.id === id);
