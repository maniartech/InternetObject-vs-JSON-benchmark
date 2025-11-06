// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // Colors
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  // Background colors
  bgCyan: '\x1b[46m',
  bgGreen: '\x1b[42m',
};

/**
 * Logs benchmark results to console
 * @param {Object} results - Benchmark results from runBenchmark
 */
export function logStats(results) {
  const { recordCount, bytes, tokens, cost } = results;

  // Generate simple bar chart
  const barLength = 50;
  const ioBar = `${colors.green}${'█'.repeat(Math.round(bytes.io / bytes.json * barLength))}${colors.reset}`;
  const jsonBar = `${colors.blue}${'█'.repeat(barLength)}${colors.reset}`;

  console.log(`\n${colors.cyan}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bright}${colors.white}  Benchmark Results: ${colors.yellow}${recordCount}${colors.white} Record(s)${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(70)}${colors.reset}`);

  console.log(`\n${colors.bright}📊 CHARACTER/BYTE COUNT:${colors.reset}`);
  console.log(`  ${colors.green}Internet Object:${colors.reset}  ${bytes.io.toLocaleString().padStart(10)} bytes ${ioBar}`);
  console.log(`  ${colors.blue}JSON:${colors.reset}             ${bytes.json.toLocaleString().padStart(10)} bytes ${jsonBar}`);
  console.log(`  ${colors.yellow}Reduction:${colors.reset}        ${colors.bright}${bytes.reduction.toFixed(2)}%${colors.reset}`);
  console.log(`  ${colors.gray}Per Record:       IO: ${bytes.perRecordIO} bytes  |  JSON: ${bytes.perRecordJSON} bytes${colors.reset}`);

  console.log(`\n${colors.bright}🤖 TOKEN COUNT (GPT-4/GPT-3.5):${colors.reset}`);
  console.log(`  ${colors.green}Internet Object:${colors.reset}  ${tokens.io.toLocaleString().padStart(10)} tokens`);
  console.log(`  ${colors.blue}JSON:${colors.reset}             ${tokens.json.toLocaleString().padStart(10)} tokens`);
  console.log(`  ${colors.yellow}Reduction:${colors.reset}        ${colors.bright}${tokens.reduction.toFixed(2)}%${colors.reset}`);
  console.log(`  ${colors.gray}Per Record:       IO: ${tokens.perRecordIO} tokens  |  JSON: ${tokens.perRecordJSON} tokens${colors.reset}`);

  console.log(`\n${colors.bright}💰 COST SAVINGS (GPT-4 @ $0.03/1K tokens):${colors.reset}`);
  console.log(`  ${colors.green}Internet Object:${colors.reset}  $${cost.io.toFixed(4)}`);
  console.log(`  ${colors.blue}JSON:${colors.reset}             $${cost.json.toFixed(4)}`);
  console.log(`  ${colors.magenta}Savings:${colors.reset}          ${colors.bright}${colors.green}$${cost.savings.toFixed(4)}${colors.reset} (${tokens.reduction.toFixed(2)}%)`);

  console.log(`${colors.cyan}${'='.repeat(70)}${colors.reset}\n`);
}

/**
 * Generates help text for CLI
 * @returns {string} Help text
 */
export function showHelp() {
  return `
${colors.bright}${colors.cyan}Internet Object vs JSON Benchmark${colors.reset}
${colors.gray}Usage: node index.js [options]${colors.reset}

${colors.bright}Options:${colors.reset}
  ${colors.green}-c, --counts <n,n,n>${colors.reset}   Record counts to benchmark (default: 1,100,1000)
  ${colors.green}-s, --save [count]${colors.reset}     Save data files (default count: 100)
  ${colors.green}-h, --help${colors.reset}            Show this help message

${colors.bright}Examples:${colors.reset}
  ${colors.gray}node index.js --counts 10,50,100${colors.reset}
  ${colors.gray}node index.js --save 500${colors.reset}
  ${colors.gray}node index.js -c 1,5,10,50 -s 50${colors.reset}
`;
}

/**
 * Logs a success message
 * @param {string} message - Message to log
 */
export function logSuccess(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}
