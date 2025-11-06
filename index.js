import { generateRecords } from './src/generators.js';
import { runBenchmark } from './src/benchmark.js';
import { logStats, showHelp } from './src/reporters.js';
import { saveData } from './src/storage.js';

// Parse command line arguments
const args = process.argv.slice(2);
const config = {
  counts: [1, 100, 1000], // default counts
  save: false,
  saveCount: 100
};

// Simple argument parser
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--counts' || arg === '-c') {
    config.counts = args[++i].split(',').map(n => parseInt(n.trim()));
  } else if (arg === '--save' || arg === '-s') {
    config.save = true;
    if (args[i + 1] && !args[i + 1].startsWith('-')) {
      config.saveCount = parseInt(args[++i]);
    }
  } else if (arg === '--help' || arg === '-h') {
    console.log(showHelp());
    process.exit(0);
  }
}

// Generate and benchmark different record counts
config.counts.forEach(count => {
  const records = generateRecords(count);
  const results = runBenchmark(records);
  logStats(results);
});

// Save data files if requested
if (config.save) {
  const recordsToSave = generateRecords(config.saveCount);
  const results = runBenchmark(recordsToSave);
  saveData(results);
  console.log(`✅ Saved ${config.saveCount} records to ./data/`);
}
