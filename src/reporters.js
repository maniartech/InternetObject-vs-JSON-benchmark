/**
 * Logs benchmark results to console
 * @param {Object} results - Benchmark results from runBenchmark
 */
export function logStats(results) {
  const { recordCount, bytes, tokens, cost } = results;

  // Generate simple bar chart
  const barLength = 50;
  const ioBar = '█'.repeat(Math.round(bytes.io / bytes.json * barLength));
  const jsonBar = '█'.repeat(barLength);

  console.log(`\n${'='.repeat(70)}`);
  console.log(`  Benchmark Results: ${recordCount} Record(s)`);
  console.log(`${'='.repeat(70)}`);

  console.log('\n📊 CHARACTER/BYTE COUNT:');
  console.log(`  Internet Object:  ${bytes.io.toLocaleString().padStart(10)} bytes ${ioBar}`);
  console.log(`  JSON:             ${bytes.json.toLocaleString().padStart(10)} bytes ${jsonBar}`);
  console.log(`  Reduction:        ${bytes.reduction.toFixed(2)}%`);
  console.log(`  Per Record:       IO: ${bytes.perRecordIO} bytes  |  JSON: ${bytes.perRecordJSON} bytes`);

  console.log('\n🤖 TOKEN COUNT (GPT-4/GPT-3.5):');
  console.log(`  Internet Object:  ${tokens.io.toLocaleString().padStart(10)} tokens`);
  console.log(`  JSON:             ${tokens.json.toLocaleString().padStart(10)} tokens`);
  console.log(`  Reduction:        ${tokens.reduction.toFixed(2)}%`);
  console.log(`  Per Record:       IO: ${tokens.perRecordIO} tokens  |  JSON: ${tokens.perRecordJSON} tokens`);

  console.log('\n💰 COST SAVINGS (GPT-4 @ $0.03/1K tokens):');
  console.log(`  Internet Object:  $${cost.io.toFixed(4)}`);
  console.log(`  JSON:             $${cost.json.toFixed(4)}`);
  console.log(`  Savings:          $${cost.savings.toFixed(4)} (${tokens.reduction.toFixed(2)}%)`);

  console.log(`${'='.repeat(70)}\n`);
}

/**
 * Generates help text for CLI
 * @returns {string} Help text
 */
export function showHelp() {
  return `
Internet Object vs JSON Benchmark
Usage: node index.js [options]

Options:
  -c, --counts <n,n,n>   Record counts to benchmark (default: 1,100,1000)
  -s, --save [count]     Save data files (default count: 100)
  -h, --help            Show this help message

Examples:
  node index.js --counts 10,50,100
  node index.js --save 500
  node index.js -c 1,5,10,50 -s 50
`;
}
