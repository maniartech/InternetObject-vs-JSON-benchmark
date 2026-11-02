import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import { DATASETS, generate } from './datasets.js';
import { FORMATS } from './formats.js';
import { ioVersion } from './io/runtime.js';
import { verifyRoundTrip } from './verify.js';

const toBytes = (out) => (typeof out === 'string' ? Buffer.from(out, 'utf8') : Buffer.from(out));

/**
 * Runs every selected format against every selected dataset and record count.
 * Resolves to a plain, JSON-serializable results object.
 */
export async function runBenchmark({ datasets, formats, counts, tokenizers, seed }) {
  const runs = [];

  for (const dataset of datasets) {
    for (const count of counts) {
      const records = generate(dataset, count, seed);
      verifyRoundTrip(dataset, records); // never report numbers for IO the parser can't read back

      const rows = [];
      for (const format of formats) {
        if (format.supports && !format.supports(dataset)) continue;

        const output = format.serialize(records, dataset);
        const buffer = toBytes(output);
        const row = {
          id: format.id,
          label: format.label,
          bytes: buffer.length,
          gzip: gzipSync(buffer, { level: 9 }).length,
          brotli: brotliCompressSync(buffer, {
            params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
          }).length,
          tokens: {},
        };
        if (!format.binary) {
          for (const tokenizer of tokenizers) {
            row.tokens[tokenizer.id] = await tokenizer.count(output);
          }
        }
        rows.push(row);
      }
      runs.push({ dataset: dataset.id, datasetLabel: dataset.label, count, rows });
    }
  }

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      seed,
      node: process.version,
      internetObject: ioVersion,
      counts,
    },
    tokenizers: tokenizers.map(({ id, label, family, models }) => ({ id, label, family, models })),
    runs,
  };
}

export const allDatasets = () => Object.values(DATASETS);
export const allFormats = () => FORMATS;
