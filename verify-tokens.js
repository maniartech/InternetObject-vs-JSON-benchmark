import { getEncoding } from 'js-tiktoken';
import fs from 'fs';

const tokenEncoder = getEncoding('cl100k_base');

// Read the saved data files
const ioData = fs.readFileSync('./data/data.io', 'utf-8');
const jsonData = fs.readFileSync('./data/data.json', 'utf-8');

console.log('='.repeat(70));
console.log('TOKEN COUNT VERIFICATION');
console.log('='.repeat(70));

// Count lines in IO data
const ioLines = ioData.trim().split('\n');
const recordCount = ioLines.filter(line => line.startsWith('~')).length;

console.log(`\nRecord Count: ${recordCount}`);

console.log('\n📊 BYTE COUNT:');
console.log(`  IO:   ${ioData.length} bytes`);
console.log(`  JSON: ${jsonData.length} bytes`);
console.log(`  Reduction: ${((jsonData.length - ioData.length) / jsonData.length * 100).toFixed(2)}%`);

console.log('\n🤖 TOKEN COUNT:');
const ioTokens = tokenEncoder.encode(ioData).length;
const jsonTokens = tokenEncoder.encode(jsonData).length;
console.log(`  IO:   ${ioTokens} tokens`);
console.log(`  JSON: ${jsonTokens} tokens`);
console.log(`  Reduction: ${((jsonTokens - ioTokens) / jsonTokens * 100).toFixed(2)}%`);

// Show header overhead
const ioHeader = ioLines.slice(0, 2).join('\n'); // First 2 lines (header + ---)
const headerTokens = tokenEncoder.encode(ioHeader).length;
console.log(`\n📋 HEADER OVERHEAD:`);
console.log(`  Header tokens: ${headerTokens}`);
console.log(`  Per-record overhead: ${(headerTokens / recordCount).toFixed(2)} tokens`);

// Calculate what JSON would be per record
console.log(`\n📈 PER-RECORD ANALYSIS:`);
console.log(`  IO total: ${ioTokens} tokens / ${recordCount} = ${(ioTokens / recordCount).toFixed(2)} tokens/record`);
console.log(`  JSON total: ${jsonTokens} tokens / ${recordCount} = ${(jsonTokens / recordCount).toFixed(2)} tokens/record`);
console.log(`  Savings: ${((jsonTokens / recordCount) - (ioTokens / recordCount)).toFixed(2)} tokens/record`);

console.log('\n' + '='.repeat(70));
