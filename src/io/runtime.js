import { readFileSync } from 'node:fs';
import * as io from 'internet-object';

/** The official Internet Object parser (`internet-object`, vendored: see README). */
export { io };

export const ioVersion = JSON.parse(
  readFileSync(new URL('../../node_modules/internet-object/package.json', import.meta.url), 'utf8')
).version;

/** Parses IO text into plain JS data (an array for collections). Throws on invalid IO. */
export function parseIO(text) {
  return io.parse(text);
}
