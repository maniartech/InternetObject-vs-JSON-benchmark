import { faker } from '@faker-js/faker';
import { arr, bool, date, document, obj, str } from './io/encode.js';

// Each dataset describes one data shape. Generation is fully driven by the
// seeded faker instance, so the same (dataset, count, seed) always yields the
// same records.
//
//   id        – stable identifier used in CLI flags and results
//   label     – human-readable name
//   flat      – true when records have no nested objects/arrays (CSV-compatible)
//   generate  – (count) => records
//   ioHeader  – IO schema header line
//   ioRow     – (record) => IO row text (without the leading "~ ")
//   normalize – (record) => comparable plain object, used by the round-trip check

const pick = (n) => Array.from({ length: n }, () => faker.color.human());

const users = {
  id: 'users',
  label: 'Users (nested object + array)',
  flat: false,
  generate(count) {
    return Array.from({ length: count }, () => {
      const colors = pick(faker.number.int({ min: 2, max: 3 }));
      const hasState = faker.number.float() > 0.1; // ~90% have a state
      const street = faker.location.streetAddress();
      const city = faker.location.city();
      const address = hasState
        ? { street, city, state: faker.location.state({ abbreviated: true }) }
        : { street, city };
      return {
        name: faker.person.fullName(),
        age: faker.number.int({ min: 22, max: 50 }),
        gender: faker.person.sex()[0],
        joiningDt: faker.date
          .between({ from: '2021-01-01', to: '2023-12-31' })
          .toISOString()
          .split('T')[0],
        address,
        colors,
        isActive: faker.datatype.boolean(),
      };
    });
  },
  ioHeader: 'name, age, gender, joiningDt, address: {street, city, state?}, colors, isActive',
  ioRow: (r) =>
    [
      str(r.name),
      r.age,
      str(r.gender),
      date(r.joiningDt),
      obj(...[str(r.address.street), str(r.address.city), r.address.state && str(r.address.state)].filter(Boolean)),
      arr(r.colors.map(str)),
      bool(r.isActive),
    ].join(', '),
};

const orders = {
  id: 'orders',
  label: 'Orders (array of objects)',
  flat: false,
  generate(count) {
    return Array.from({ length: count }, () => {
      const items = Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => ({
        sku: faker.string.alphanumeric({ length: 8, casing: 'upper' }),
        name: faker.commerce.productName(),
        qty: faker.number.int({ min: 1, max: 6 }),
        price: faker.number.float({ min: 1, max: 500, fractionDigits: 2 }),
      }));
      return {
        id: faker.string.uuid(),
        customer: faker.person.fullName(),
        status: faker.helpers.arrayElement(['pending', 'paid', 'shipped', 'delivered', 'refunded']),
        placedAt: faker.date.between({ from: '2024-01-01', to: '2025-12-31' }).toISOString().split('T')[0],
        items,
        total: Number(items.reduce((sum, i) => sum + i.qty * i.price, 0).toFixed(2)),
      };
    });
  },
  ioHeader: 'id, customer, status, placedAt, items: [{sku, name, qty, price}], total',
  ioRow: (r) =>
    [
      str(r.id),
      str(r.customer),
      str(r.status),
      date(r.placedAt),
      arr(r.items.map((i) => obj(str(i.sku), str(i.name), i.qty, i.price))),
      r.total,
    ].join(', '),
};

const metrics = {
  id: 'metrics',
  label: 'Metrics (flat, numeric)',
  flat: true,
  generate(count) {
    const start = Date.parse('2025-01-01T00:00:00Z');
    return Array.from({ length: count }, (_, i) => ({
      ts: new Date(start + i * 60_000).toISOString().replace('.000Z', 'Z'),
      host: `web-${faker.number.int({ min: 1, max: 12 })}`,
      cpu: faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      mem: faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      reqs: faker.number.int({ min: 0, max: 5000 }),
      ok: faker.datatype.boolean({ probability: 0.95 }),
    }));
  },
  ioHeader: 'ts, host, cpu, mem, reqs, ok',
  ioRow: (r) => [str(r.ts), str(r.host), r.cpu, r.mem, r.reqs, bool(r.ok)].join(', '),
};

export const DATASETS = { users, orders, metrics };

/** Generates records for a dataset with a fixed seed. */
export function generate(dataset, count, seed) {
  faker.seed(seed);
  faker.setDefaultRefDate('2026-01-01T00:00:00Z');
  return dataset.generate(count);
}

/** Serializes records of a dataset as a complete IO document. */
export function toIO(dataset, records) {
  return document(dataset.ioHeader, records.map(dataset.ioRow));
}
