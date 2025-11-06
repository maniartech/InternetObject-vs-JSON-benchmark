import { faker } from '@faker-js/faker';

/**
 * Generates a single record with random data
 * @returns {Object} Generated record
 */
export function generateRecord() {
  const person = faker.person;
  const address = faker.location;

  // Generate random colors (2-3 colors)
  const colorCount = faker.number.int({ min: 2, max: 3 });
  const colors = [];
  for (let i = 0; i < colorCount; i++) {
    colors.push(faker.color.human());
  }

  return {
    name: person.fullName(),
    age: faker.number.int({ min: 22, max: 50 }),
    gender: faker.person.sex()[0], // 'f' or 'm'
    joiningDt: faker.date.between({ from: '2021-01-01', to: '2023-12-31' }).toISOString().split('T')[0],
    address: {
      street: address.streetAddress(),
      city: address.city(),
      state: Math.random() > 0.1 ? address.state({ abbreviated: true }) : undefined // 90% have state
    },
    colors: colors,
    isActive: faker.datatype.boolean()
  };
}

/**
 * Generates multiple records
 * @param {number} count - Number of records to generate
 * @returns {Array} Array of generated records
 */
export function generateRecords(count) {
  const records = [];
  for (let i = 0; i < count; i++) {
    records.push(generateRecord());
  }
  return records;
}
