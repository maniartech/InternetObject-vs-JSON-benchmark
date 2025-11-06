import { getEncoding } from 'js-tiktoken';
import { toIOHeader, toIOData } from './formatters.js';

// Initialize tiktoken encoder (cl100k_base is used by GPT-4, GPT-3.5-turbo)
const tokenEncoder = getEncoding('cl100k_base');

/**
 * Runs benchmark on a set of records
 * @param {Array} records - Array of records to benchmark
 * @returns {Object} Benchmark results
 */
export function runBenchmark(records) {
  const ioHeader = toIOHeader();
  const ioRecords = records.map(r => toIOData(r));
  const jsonRecords = records;

  // Calculate sizes
  const ioLen = ioRecords.reduce((len, r) => len + r.length, 0);
  const ioLenWithHeader = ioHeader.length + ioLen + 5; // +5 for "\n---\n"
  const jsonStr = JSON.stringify(jsonRecords);
  const jsonLen = jsonStr.length;

  // Calculate tokens (actual LLM tokens)
  const ioDataStr = ioHeader + "\n---\n" + ioRecords.map(r => `~ ${r}`).join('\n');
  const ioTokens = tokenEncoder.encode(ioDataStr).length;
  const jsonTokens = tokenEncoder.encode(jsonStr).length;

  // Calculate reductions
  const byteReduction = 100 - (Math.round(ioLenWithHeader * 10000 / jsonLen) / 100);
  const tokenReduction = 100 - (Math.round(ioTokens * 10000 / jsonTokens) / 100);

  // Calculate per-record metrics
  const recordCount = records.length;
  const bytesPerRecordIO = Math.round(ioLenWithHeader / recordCount);
  const bytesPerRecordJSON = Math.round(jsonLen / recordCount);
  const tokensPerRecordIO = Math.round(ioTokens / recordCount * 100) / 100;
  const tokensPerRecordJSON = Math.round(jsonTokens / recordCount * 100) / 100;

  return {
    recordCount,
    bytes: {
      io: ioLenWithHeader,
      json: jsonLen,
      reduction: byteReduction,
      perRecordIO: bytesPerRecordIO,
      perRecordJSON: bytesPerRecordJSON
    },
    tokens: {
      io: ioTokens,
      json: jsonTokens,
      reduction: tokenReduction,
      perRecordIO: tokensPerRecordIO,
      perRecordJSON: tokensPerRecordJSON
    },
    cost: {
      io: (ioTokens / 1000 * 0.03),
      json: (jsonTokens / 1000 * 0.03),
      savings: ((jsonTokens - ioTokens) / 1000 * 0.03)
    },
    raw: {
      ioHeader,
      ioRecords,
      jsonRecords
    }
  };
}
