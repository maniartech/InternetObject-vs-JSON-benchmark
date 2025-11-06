import fs from 'fs';
import { faker } from '@faker-js/faker';
import { getEncoding } from 'js-tiktoken';

// Initialize tiktoken encoder (cl100k_base is used by GPT-4, GPT-3.5-turbo)
const tokenEncoder = getEncoding('cl100k_base');

function logStats(records) {
  const {
    ioHeader,
    ioRecords,
    jsonRecords
  } = records

  // Calculate sizes
  const ioLen = ioRecords.reduce((len, r) => len + r.length, 0)
  const ioLenWithHeader = ioHeader.length + ioLen + 5 // +5 for "\n---\n"
  const jsonStr = JSON.stringify(jsonRecords)
  const jsonLen = jsonStr.length

  // Calculate tokens (actual LLM tokens)
  const ioDataStr = ioHeader + "\n---\n" + ioRecords.map(r => `~ ${r}`).join('\n')
  const ioTokens = tokenEncoder.encode(ioDataStr).length
  const jsonTokens = tokenEncoder.encode(jsonStr).length

  // Calculate reductions
  const byteReduction = 100 - (Math.round(ioLenWithHeader * 10000 / jsonLen) / 100)
  const tokenReduction = 100 - (Math.round(ioTokens * 10000 / jsonTokens) / 100)

  // Calculate per-record metrics
  const recordCount = ioRecords.length
  const bytesPerRecordIO = Math.round(ioLenWithHeader / recordCount)
  const bytesPerRecordJSON = Math.round(jsonLen / recordCount)
  const tokensPerRecordIO = Math.round(ioTokens / recordCount * 100) / 100
  const tokensPerRecordJSON = Math.round(jsonTokens / recordCount * 100) / 100

  // Generate simple bar chart
  const barLength = 50
  const ioBar = '█'.repeat(Math.round(ioLenWithHeader / jsonLen * barLength))
  const jsonBar = '█'.repeat(barLength)

  console.log(`\n${'='.repeat(70)}`)
  console.log(`  Benchmark Results: ${recordCount} Record(s)`)
  console.log(`${'='.repeat(70)}`)

  console.log('\n📊 CHARACTER/BYTE COUNT:')
  console.log(`  Internet Object:  ${ioLenWithHeader.toLocaleString().padStart(10)} bytes ${ioBar}`)
  console.log(`  JSON:             ${jsonLen.toLocaleString().padStart(10)} bytes ${jsonBar}`)
  console.log(`  Reduction:        ${byteReduction.toFixed(2)}%`)
  console.log(`  Per Record:       IO: ${bytesPerRecordIO} bytes  |  JSON: ${bytesPerRecordJSON} bytes`)

  console.log('\n🤖 TOKEN COUNT (GPT-4/GPT-3.5):')
  console.log(`  Internet Object:  ${ioTokens.toLocaleString().padStart(10)} tokens`)
  console.log(`  JSON:             ${jsonTokens.toLocaleString().padStart(10)} tokens`)
  console.log(`  Reduction:        ${tokenReduction.toFixed(2)}%`)
  console.log(`  Per Record:       IO: ${tokensPerRecordIO} tokens  |  JSON: ${tokensPerRecordJSON} tokens`)

  console.log('\n💰 COST SAVINGS (GPT-4 @ $0.03/1K tokens):')
  const costIO = (ioTokens / 1000 * 0.03).toFixed(4)
  const costJSON = (jsonTokens / 1000 * 0.03).toFixed(4)
  const savings = ((jsonTokens - ioTokens) / 1000 * 0.03).toFixed(4)
  console.log(`  Internet Object:  $${costIO}`)
  console.log(`  JSON:             $${costJSON}`)
  console.log(`  Savings:          $${savings} (${tokenReduction.toFixed(2)}%)`)

  console.log(`${'='.repeat(70)}\n`)
}

function saveIOData (records) {
  // Save Internet Object Records
  const ioStream = fs.createWriteStream("./data/data.io")
  ioStream.write(records.ioHeader)
  ioStream.write("\n---\n")
  records.ioRecords.forEach((record) => {
    ioStream.write(`~ ${record}\n`)
  })
  ioStream.end()

  // Save JSON Records
  fs.writeFileSync("./data/data.json", JSON.stringify(records.jsonRecords))
}

function generateRecords(count) {

  // Loop and generate JSON and IO records
  let jsonRecords = [];
  let ioRecords = [];
  let ioLen = 0;
  let jsonLen = 0;

  while(count !== 0) {
    const r = generateRecord()
    const ioData = toIOData(r)
    // const jsonData = JSON.stringify(r)
    jsonRecords.push(r);
    ioRecords.push(ioData);

    count--;
  }

  // Find the lengths and diffs
  // const diff = ioLen * 100 / jsonLen

  return {
    ioHeader: toIOHeader(),
    ioRecords,
    jsonRecords,
    // jsonLen,
    // ioLen,
    // diff
  }
}

function generateRecord() {
  const person = faker.person
  const address = faker.location

  // Generate random colors (2-3 colors)
  const colorCount = faker.number.int({ min: 2, max: 3 })
  const colors = []
  for (let i = 0; i < colorCount; i++) {
    colors.push(faker.color.human())
  }

  const data = {
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
  }

  return data
}

function toIOHeader() {
  return "name, age, gender, joiningDt, address: {street, city, state?}, colors, isActive"
}

function toIOData(r) {
  // Format address object
  const addressParts = [_(r.address.street), _(r.address.city)]
  if (r.address.state) {
    addressParts.push(r.address.state)
  }
  const addressStr = `{${addressParts.join(', ')}}`

  // Format colors array
  const colorsStr = `[${r.colors.join(', ')}]`

  // Format boolean as T/F
  const isActiveStr = r.isActive ? 'T' : 'F'

  // Format date as d'YYYY-MM-DD'
  const dateStr = `d'${r.joiningDt}'`

  return `${_(r.name)}, ${r.age}, ${r.gender}, ${dateStr}, ${addressStr}, ${colorsStr}, ${isActiveStr}`
}

// Escapes strings for Internet Object format
// Rules:
// 1. If string contains comma, double-quote, or needs escaping -> wrap in quotes
// 2. Escape any double-quotes inside the string
// 3. Otherwise, return as-is for minimal size
function _(str) {
  if (typeof str !== 'string') {
    return String(str);
  }

  // Check if string needs quoting (contains special chars)
  const needsQuotes = str.includes(',') ||
                      str.includes('"') ||
                      str.includes('\n') ||
                      str.includes('\r') ||
                      str.trim() !== str; // leading/trailing whitespace

  if (needsQuotes) {
    // Escape any existing double-quotes
    const escaped = str.replace(/"/g, '\\"');
    return `"${escaped}"`;
  }

  // Return as-is if no special characters
  return str;
}

// Parse command line arguments
const args = process.argv.slice(2)
const config = {
  counts: [1, 100, 1000], // default counts
  save: false,
  saveCount: 100
}

// Simple argument parser
for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  if (arg === '--counts' || arg === '-c') {
    config.counts = args[++i].split(',').map(n => parseInt(n.trim()))
  } else if (arg === '--save' || arg === '-s') {
    config.save = true
    if (args[i + 1] && !args[i + 1].startsWith('-')) {
      config.saveCount = parseInt(args[++i])
    }
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
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
`)
    process.exit(0)
  }
}

// Generate and benchmark different record counts
config.counts.forEach(count => {
  const records = generateRecords(count)
  logStats(records)
})

// Save data files if requested
if (config.save) {
  const recordsToSave = generateRecords(config.saveCount)
  saveIOData(recordsToSave)
  console.log(`✅ Saved ${config.saveCount} records to ./data/`)
}
