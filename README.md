# Internet Object vs JSON Benchmarks

Compares the character/byte count and token usage of Internet Object vs JSON output when serialized. This benchmark is particularly relevant for:

- 🤖 **AI/LLM Context Windows** - Fewer tokens means more data in your prompts
- 💰 **API Costs** - Token-based pricing (OpenAI, Anthropic, etc.)
- 🌐 **Network Bandwidth** - Smaller payloads, faster transfers
- 💾 **Storage Efficiency** - Reduced storage requirements

## Features

- ✅ Actual GPT-4/GPT-3.5 token counting (not just character count)
- ✅ Cost comparison based on current OpenAI pricing
- ✅ Per-record metrics with colorful CLI output
- ✅ Configurable benchmark runs
- ✅ Visual ASCII bar charts
- ✅ Proper string escaping for Internet Object format

## Installation

```sh
npm install
```

## Usage

### Default Benchmark (1, 100, 1000 records)
```sh
npm start
```

### Custom Record Counts
```sh
npm start -- --counts 10,50,100,500
```

### Save Data Files
```sh
npm start -- --save 100
```

### Combined Options
```sh
npm start -- --counts 1,5,10,50 --save 50
```

### Help
```sh
npm start -- --help
```

## Sample Output

```
======================================================================
  Benchmark Results: 100 Record(s)
======================================================================

📊 CHARACTER/BYTE COUNT:
  Internet Object:      10,052 bytes █████████████████████████
  JSON:                 19,807 bytes ██████████████████████████████████████████████████
  Reduction:        49.25%
  Per Record:       IO: 101 bytes  |  JSON: 198 bytes

🤖 TOKEN COUNT (GPT-4/GPT-3.5):
  Internet Object:       4,174 tokens
  JSON:                  5,749 tokens
  Reduction:        27.40%
  Per Record:       IO: 41.74 tokens  |  JSON: 57.49 tokens

💰 COST SAVINGS (GPT-4 @ $0.03/1K tokens):
  Internet Object:  $0.1252
  JSON:             $0.1725
  Savings:          $0.0473 (27.40%)
======================================================================
```

## What's Measured

- **Byte Count**: Raw character/byte size of serialized data
- **Token Count**: Actual tokens as counted by GPT-4's tokenizer (cl100k_base)
- **Cost Analysis**: Estimated API costs based on current pricing
- **Per-Record Metrics**: Average size/tokens per record
- **Reduction Percentage**: How much smaller Internet Object is vs JSON

## Technical Details

### Project Structure

The benchmark is modularized for maintainability:

```
io-bench/
├── index.js              # Main entry point & CLI
├── src/
│   ├── generators.js     # Data generation with faker
│   ├── formatters.js     # IO & JSON formatting
│   ├── benchmark.js      # Core benchmarking logic
│   ├── reporters.js      # Console output & help text
│   └── storage.js        # File saving functionality
├── data/                 # Generated data files
└── package.json
```

### Data Structure

The benchmark generates realistic user records with:
- Personal information (name, age, gender, joining date)
- Address object (street, city, optional state)
- Array of favorite colors
- Boolean status flag

**Internet Object Format:**
```
name, age, gender, joiningDt, address: {street, city, state?}, colors, isActive
---
~ Alice Smith, 28, f, d'2021-04-15', {Elm Street, Dallas, TX}, [yellow, green], T
~ Bob Johnson, 22, m, d'2022-02-20', {Oak Street, Chicago, IL}, [blue, black], T
~ Rachel Green, 31, f, d'2021-12-11', {Sunset Boulevard, Los Angeles, CA}, [purple, pink], T
```

**JSON Format:**
```json
[
  {
    "name": "Alice Smith",
    "age": 28,
    "gender": "f",
    "joiningDt": "2021-04-15",
    "address": {
      "street": "Elm Street",
      "city": "Dallas",
      "state": "TX"
    },
    "colors": ["yellow", "green"],
    "isActive": true
  }
]
```

## Key Benefits

- **~50% byte reduction** - Internet Object is half the size of JSON (verified across 10-1000+ records)
- **~30% token reduction** - Significant LLM API cost savings for larger datasets
- **Schema-first approach** - Header defines structure once, not per record
- **Type hints** - Built-in date format (d'...'), boolean (T/F), optional fields (?)
- **Better scalability** - Header overhead amortized across many records

### Important Note: Breakeven Point

For **single records**, JSON may use fewer tokens due to IO's schema header overhead (24 tokens). However:
- **3-5 records**: Breakeven point
- **10+ records**: IO format shows clear advantages
- **100+ records**: ~50% byte savings, ~30% token savings
- **500+ records**: Savings stabilize at optimal levels

**Recommendation**: Use Internet Object for datasets with 5+ records for maximum efficiency.

## Important Disclaimer

⚠️ **This benchmark uses simulated Internet Object format** - The data output mimics IO syntax but is not validated by the official Internet Object parser library. The format follows IO structure conventions closely enough to provide accurate size and token comparisons.

**Key Points:**
- Generated data follows IO syntax rules (schema header, delimiters, type hints)
- String escaping and formatting match IO specifications
- Results are representative of actual IO format efficiency
- **Variance**: Re-running the benchmark may show ±5% variation due to random data generation
- For production use, validate with the official [Internet Object library](https://github.com/maniartech/InternetObject-js)

The benchmark's primary goal is to demonstrate the size and token efficiency gains of the IO format approach compared to JSON.

## String Escaping

String escaping properly handles:
- Commas (`,`)
- Quotes (`"`)
- Newlines and whitespace
- Special characters

## Questions?

For questions about this benchmark, email <hello@internetobject.org>
