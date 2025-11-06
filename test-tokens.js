import { getEncoding } from 'js-tiktoken';

const tokenEncoder = getEncoding('cl100k_base');

// IO format
const ioData = `name, age, gender, joiningDt, address: {street, city, state?}, colors, isActive
---
~ Devin Shields, 34, f, d'2023-11-12', {2049 Leffler Manor, Julianaland, CT}, [fuchsia, indigo, purple], T`;

// JSON format (minified)
const jsonData = `[{"name":"Devin Shields","age":34,"gender":"f","joiningDt":"2023-11-12","address":{"street":"2049 Leffler Manor","city":"Julianaland","state":"CT"},"colors":["fuchsia","indigo","purple"],"isActive":true}]`;

console.log('IO Data:');
console.log(ioData);
console.log('\nIO Length:', ioData.length, 'bytes');
console.log('IO Tokens:', tokenEncoder.encode(ioData).length);
console.log('IO Token details:', tokenEncoder.encode(ioData));

console.log('\n' + '='.repeat(70) + '\n');

console.log('JSON Data:');
console.log(jsonData);
console.log('\nJSON Length:', jsonData.length, 'bytes');
console.log('JSON Tokens:', tokenEncoder.encode(jsonData).length);
console.log('JSON Token details:', tokenEncoder.encode(jsonData));

console.log('\n' + '='.repeat(70) + '\n');

const ioTokens = tokenEncoder.encode(ioData).length;
const jsonTokens = tokenEncoder.encode(jsonData).length;

console.log('Comparison:');
console.log(`IO:   ${ioTokens} tokens (${ioData.length} bytes)`);
console.log(`JSON: ${jsonTokens} tokens (${jsonData.length} bytes)`);
console.log(`Token difference: ${jsonTokens - ioTokens} (${((jsonTokens - ioTokens) / jsonTokens * 100).toFixed(2)}%)`);
console.log(`Byte difference: ${jsonData.length - ioData.length} (${((jsonData.length - ioData.length) / jsonData.length * 100).toFixed(2)}%)`);
