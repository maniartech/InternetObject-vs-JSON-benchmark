const nf = new Intl.NumberFormat('en-US');
const fmt = (n) => nf.format(n);

/** "3,812 (-41.2%)" relative to the baseline value; baseline itself is bare. */
function cell(value, baseline, isBaseline) {
  if (value === undefined) return '–';
  if (isBaseline || !baseline) return fmt(value);
  const delta = ((value - baseline) / baseline) * 100;
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '';
  return `${fmt(value)} (${sign}${Math.abs(delta).toFixed(1)}%)`;
}

/** Smallest defined value in a column (ties all count as best). */
const best = (values) => Math.min(...values.filter((v) => v !== undefined));

function tableFor(run, tokenizers, baselineId, { highlight = false } = {}) {
  const base = run.rows.find((r) => r.id === baselineId) ?? run.rows[0];
  const columns = [
    (r) => r.bytes,
    (r) => r.gzip,
    (r) => r.brotli,
    ...tokenizers.map((t) => (r) => r.tokens[t.id]),
  ];
  const winners = columns.map((get) => best(run.rows.map(get)));
  const head = ['Format', 'Bytes', 'gzip', 'brotli', ...tokenizers.map((t) => t.label)];
  const body = run.rows.map((r) => {
    const isBase = r === base;
    return [
      r.label,
      ...columns.map((get, i) => {
        const text = cell(get(r), get(base), isBase);
        return highlight && get(r) === winners[i] ? `**${text}**` : text;
      }),
    ];
  });
  return { head, body };
}

/** Percentages are relative to minified JSON; negative means smaller. */
export function toMarkdown(results, { baseline = 'json' } = {}) {
  const { meta, tokenizers, runs } = results;
  const lines = [];
  lines.push(
    `<sub>Generated ${meta.generatedAt.slice(0, 10)} · seed ${meta.seed} · Node ${meta.node} · internet-object ${meta.internetObject}. Percentages are relative to minified JSON (lower is better). <b>Bold</b> marks the best (smallest) value in each column.</sub>`,
    ''
  );
  for (const run of runs) {
    const { head, body } = tableFor(run, tokenizers, baseline, { highlight: true });
    lines.push(`### ${run.datasetLabel} — ${fmt(run.count)} record${run.count === 1 ? '' : 's'}`, '');
    lines.push(`| ${head.join(' | ')} |`);
    lines.push(`|${head.map((_, i) => (i === 0 ? ' --- ' : ' ---: ')).join('|')}|`);
    for (const row of body) lines.push(`| ${row.join(' | ')} |`);
    lines.push('');
  }
  return lines.join('\n');
}

export function toConsole(results, { baseline = 'json' } = {}) {
  const { meta, tokenizers, runs } = results;
  const out = [];
  out.push(`\nseed ${meta.seed} · Node ${meta.node} · internet-object ${meta.internetObject}`);
  for (const run of runs) {
    const { head, body } = tableFor(run, tokenizers, baseline);
    const widths = head.map((h, i) => Math.max(h.length, ...body.map((r) => r[i].length)));
    const line = (cells) => cells.map((c, i) => (i === 0 ? c.padEnd(widths[i]) : c.padStart(widths[i]))).join('  ');
    out.push(`\n${run.datasetLabel} — ${fmt(run.count)} record(s)`);
    out.push(line(head));
    out.push(widths.map((w) => '─'.repeat(w)).join('  '));
    body.forEach((r) => out.push(line(r)));
  }
  return out.join('\n') + '\n';
}
