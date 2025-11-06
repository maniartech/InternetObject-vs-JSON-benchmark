# Architecture

## Overview

The io-bench benchmark tool is modularized into focused, testable modules:

## Module Structure

### `index.js` - Main Entry Point
- CLI argument parsing
- Orchestrates benchmark execution
- Minimal logic, delegates to modules

### `src/generators.js` - Data Generation
**Responsibilities:**
- Generate random user records using faker
- Configurable data scenarios
- Maintains consistent data structure

**Exports:**
- `generateRecord()` - Single record
- `generateRecords(count)` - Multiple records

### `src/formatters.js` - Format Conversion
**Responsibilities:**
- Convert records to IO format
- Convert records to JSON format
- Handle string escaping for IO syntax

**Exports:**
- `toIOHeader()` - Generate IO schema header
- `toIOData(record)` - Format single record as IO
- `toJSON(record)` - Format as JSON

### `src/benchmark.js` - Benchmarking Logic
**Responsibilities:**
- Calculate byte counts (IO vs JSON)
- Calculate token counts using tiktoken
- Compute reduction percentages
- Calculate API costs

**Exports:**
- `runBenchmark(records)` - Returns complete metrics

**Returns:**
```javascript
{
  recordCount: number,
  bytes: { io, json, reduction, perRecordIO, perRecordJSON },
  tokens: { io, json, reduction, perRecordIO, perRecordJSON },
  cost: { io, json, savings },
  raw: { ioHeader, ioRecords, jsonRecords }
}
```

### `src/reporters.js` - Output Formatting
**Responsibilities:**
- Console output formatting
- Visual bar charts
- Help text generation

**Exports:**
- `logStats(results)` - Pretty print results
- `showHelp()` - CLI help text

### `src/storage.js` - File Operations
**Responsibilities:**
- Save IO format to disk
- Save JSON format to disk
- Manage output directory

**Exports:**
- `saveData(results, outputDir)` - Save benchmark data

## Benefits of This Architecture

1. **Testability** - Each module can be unit tested independently
2. **Maintainability** - Clear separation of concerns
3. **Extensibility** - Easy to add new formatters, reporters, or data generators
4. **Reusability** - Modules can be imported by other tools
5. **Readability** - ~50 lines per module vs 280+ line monolith

## Future Extensions

Potential enhancements enabled by this structure:

- **Additional Formatters** - Protobuf, MessagePack, CBOR, etc.
- **Multiple Reporters** - JSON output, HTML reports, CSV exports
- **Custom Data Schemas** - User-defined data structures
- **Performance Tests** - Parse/serialize speed benchmarks
- **Test Suite** - Jest tests for each module
- **TypeScript** - Type safety without major refactoring
