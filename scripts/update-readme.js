// Refreshes the generated sections of README.md from results/latest.json, so
// published numbers always come from a recorded run:
//
//   npm run bench && npm run readme
import { readFileSync, writeFileSync } from 'node:fs';
import { toMarkdown } from '../src/report.js';

const results = JSON.parse(readFileSync(new URL('../results/latest.json', import.meta.url), 'utf8'));
const readmePath = new URL('../README.md', import.meta.url);
const HEADLINE_COUNT = 1000;

const pct = (value, base) => {
  const d = ((value - base) / base) * 100;
  return `${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d).toFixed(1)}%`;
};

function headline(kind) {
  const runs = results.runs.filter((r) => r.count === HEADLINE_COUNT && (r.kind ?? 'synthetic') === kind);
  return runs.length ? toMarkdown({ ...results, runs }) : '_Run `npm run fetch-data` and `npm run bench` to add these._';
}

function sources() {
  const rows = Object.entries(results.meta.sources ?? {});
  if (!rows.length) return '_No real datasets in this run._';
  const out = ['| Id | Hugging Face dataset | Licence | Revision | Notes |', '| --- | --- | --- | --- | --- |'];
  for (const [id, s] of rows) {
    const notes = [s.note, s.excludedRows ? `${s.excludedRows} rows dropped: IO cannot write strings starting with \`$\`/\`@\`` : null].filter(Boolean).join('; ');
    out.push(`| \`${id}\` | [${s.dataset}](${s.url}) | ${s.license} | \`${s.revision.slice(0, 8)}\` | ${notes || '–'} |`);
  }
  return out.join('\n');
}

// Smallest format per column at the headline record count.
function winners() {
  const runs = results.runs.filter((r) => r.count === HEADLINE_COUNT);
  const cols = [
    ['Bytes', (r) => r.bytes],
    ['gzip', (r) => r.gzip],
    ...results.tokenizers.map((t) => [t.label, (r) => r.tokens[t.id]]),
  ];
  const out = [`| Dataset | ${cols.map(([n]) => n).join(' | ')} |`, `| --- |${cols.map(() => ' --- |').join('')}`];
  for (const run of runs) {
    const json = run.rows.find((r) => r.id === 'json');
    const cells = cols.map(([, get]) => {
      const values = run.rows.map(get).filter((v) => v !== undefined);
      const min = Math.min(...values);
      const top = run.rows.filter((r) => get(r) === min);
      return `**${top.map((r) => r.label).join(' / ')}** (${pct(min, get(json))})`;
    });
    out.push(`| ${run.datasetLabel} | ${cells.join(' | ')} |`);
  }
  return out.join('\n');
}

// Token change of IO vs JSON by record count, for each tokenizer family.
function scaling() {
  const counts = [...new Set(results.runs.map((r) => r.count))];
  const out = [];
  for (const tok of results.tokenizers) {
    out.push(`**${tok.label}** — Internet Object tokens vs minified JSON\n`);
    out.push(`| Dataset | ${counts.map((c) => c.toLocaleString('en-US')).join(' | ')} |`);
    out.push(`| --- |${counts.map(() => ' ---: |').join('')}`);
    for (const dataset of new Set(results.runs.map((r) => r.dataset))) {
      const cells = counts.map((count) => {
        const run = results.runs.find((r) => r.dataset === dataset && r.count === count);
        const json = run.rows.find((r) => r.id === 'json').tokens[tok.id];
        const io = run.rows.find((r) => r.id === 'io').tokens[tok.id];
        return pct(io, json);
      });
      const label = results.runs.find((r) => r.dataset === dataset).datasetLabel;
      out.push(`| ${label} | ${cells.join(' | ')} |`);
    }
    out.push('');
  }
  return out.join('\n');
}

function replaceBlock(text, name, body) {
  const re = new RegExp(`(<!-- ${name}:start -->)[\\s\\S]*?(<!-- ${name}:end -->)`);
  if (!re.test(text)) throw new Error(`README.md is missing the <!-- ${name}:start/end --> markers`);
  return text.replace(re, (_, start, end) => `${start}\n${body.trim()}\n${end}`); // function form: `body` may contain `$`
}

let readme = readFileSync(readmePath, 'utf8');
readme = replaceBlock(readme, 'winners', winners());
readme = replaceBlock(readme, 'results', headline('synthetic'));
if (results.runs.some((r) => r.kind === 'real')) {
  readme = replaceBlock(readme, 'sources', sources());
  readme = replaceBlock(readme, 'results-real', headline('real'));
}
readme = replaceBlock(readme, 'scaling', scaling());
writeFileSync(readmePath, readme);
console.log('README.md updated from results/latest.json');
