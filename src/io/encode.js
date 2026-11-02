// Internet Object text encoder used by the benchmark datasets.
//
// The official `internet-object` package's `stringify()` currently emits JSON,
// so IO text is produced here and then verified against the official parser
// (see `verifyRoundTrip` in src/verify.js). Anything the parser does not read
// back identically fails the run.

// Characters (or shapes) that would be misread as IO syntax if left bare.
// A `'` is quoted because `O'Neil` is read as the annotation `O'...'`; `#`
// starts a comment; a leading `$` names a schema or definition.
const NEEDS_QUOTES = /[,"'#{}[\]:~\\\n\r\t]|^[$@]|^\s|\s$|^$/;

// Bare values the parser reads as another type. Single-letter T/F/N are
// case-sensitive (lowercase `f`/`m` stay strings); the rest are not. Numbers
// include 0x/0b/0o literals and exponent-like prefixes such as `1E5F`.
const TYPED_LITERALS = [
  /^(?:T|F|N)$/,
  /^[-+]?(?:true|false|null|inf|infinity|nan)$/i,
  /^[-+]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?$/,
  /^[-+]?0[bBoOxX]/,
  /^[-+]?\d+[eE]\d/,
  /^[-+]?\d+\.$/, // `2010.` is read as the number 2010
];

/** Encodes a string value, quoting only when the syntax requires it. */
export function str(value) {
  const s = String(value);
  if (NEEDS_QUOTES.test(s) || TYPED_LITERALS.some((re) => re.test(s))) return JSON.stringify(s);
  return s;
}

export const bool = (v) => (v ? 'T' : 'F');
export const date = (isoDate) => `d'${isoDate}'`;
export const obj = (...fields) => `{${fields.join(', ')}}`;
export const arr = (items) => `[${items.join(', ')}]`;

/** Builds a complete IO document: schema header, separator, one `~` row per record. */
export function document(header, rows) {
  return `${header}\n---\n${rows.map((r) => `~ ${r}`).join('\n')}\n`;
}
