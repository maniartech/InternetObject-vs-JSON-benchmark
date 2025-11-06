import fs from 'fs';

/**
 * Saves benchmark data to files
 * @param {Object} results - Benchmark results
 * @param {string} outputDir - Output directory path
 */
export function saveData(results, outputDir = './data') {
  const { raw } = results;

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save Internet Object Records
  const ioStream = fs.createWriteStream(`${outputDir}/data.io`);
  ioStream.write(raw.ioHeader);
  ioStream.write("\n---\n");
  raw.ioRecords.forEach((record) => {
    ioStream.write(`~ ${record}\n`);
  });
  ioStream.end();

  // Save JSON Records
  fs.writeFileSync(`${outputDir}/data.json`, JSON.stringify(raw.jsonRecords));
}
