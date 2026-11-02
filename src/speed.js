import { Bench } from 'tinybench';
import { generate } from './datasets.js';

/**
 * Measures serialize and parse throughput (operations per second) for each
 * format on one dataset. Parsing uses each format's own reference library.
 */
export async function runSpeed({ dataset, formats, count, seed, time = 300 }) {
  const records = generate(dataset, count, seed);
  const active = formats.filter((f) => !f.supports || f.supports(dataset));
  const outputs = new Map(active.map((f) => [f.id, f.serialize(records, dataset)]));

  const bench = new Bench({ time, warmupTime: 100 });
  for (const f of active) {
    bench.add(`serialize:${f.id}`, () => f.serialize(records, dataset));
    if (f.parse) bench.add(`parse:${f.id}`, () => f.parse(outputs.get(f.id), dataset));
  }
  await bench.run();

  const throughput = new Map(bench.tasks.map((t) => [t.name, t.result?.throughput?.mean]));
  return {
    dataset: dataset.id,
    datasetLabel: dataset.label,
    count,
    rows: active.map((f) => ({
      id: f.id,
      label: f.label,
      serialize: throughput.get(`serialize:${f.id}`),
      parse: throughput.get(`parse:${f.id}`),
    })),
  };
}
