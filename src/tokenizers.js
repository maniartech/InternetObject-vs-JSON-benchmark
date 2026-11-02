import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

// A tokenizer adapter is { id, label, family, source, count(text) -> number }.
// `count` may be async (remote tokenizers). Tokenizers whose prerequisites are
// missing (API key, optional package) report `available: false` and are
// skipped, with the reason shown in the report.
//
// Model families are not interchangeable: the same text produces different
// token counts under each vocabulary, which is why the report shows all of them.

const CACHE_PATH = new URL('../results/token-cache.json', import.meta.url);

/** Disk-backed cache so remote counts are paid for once and can be committed. */
function createCache() {
  let data = {};
  try {
    data = JSON.parse(readFileSync(CACHE_PATH, 'utf8'));
  } catch {
    // first run
  }
  return {
    get: (key) => data[key],
    set(key, value) {
      data[key] = value;
    },
    save() {
      if (Object.keys(data).length === 0) return; // nothing remote was counted
      const path = CACHE_PATH.pathname;
      if (!existsSync(dirname(path))) mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
    },
  };
}

const cache = createCache();
export const saveTokenCache = () => cache.save();
const digest = (...parts) => createHash('sha256').update(parts.join('\u0000')).digest('hex');

// ---- OpenAI (offline, exact) ------------------------------------------------

async function openaiEncoding(id, label, models, importPath) {
  const { countTokens } = await import(importPath);
  return { id, label, family: 'OpenAI', source: 'local', models, count: (text) => countTokens(text) };
}

// ---- Anthropic (remote, exact) ----------------------------------------------
// The npm `@anthropic-ai/tokenizer` package only matches Claude 2, so current
// Claude models are counted through the (free) count_tokens endpoint instead.

function anthropicTokenizer(model) {
  const key = process.env.ANTHROPIC_API_KEY;
  const id = `claude:${model}`;
  const base = { id, label: `Claude (${model})`, family: 'Anthropic', source: 'api', models: [model] };
  if (!key) return { ...base, available: false, reason: 'set ANTHROPIC_API_KEY to enable' };

  const request = async (text) => {
    const cacheKey = digest('anthropic', model, text);
    const hit = cache.get(cacheKey);
    if (hit !== undefined) return hit;
    const res = await fetch('https://api.anthropic.com/v1/messages/count_tokens', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: text }] }),
    });
    if (!res.ok) throw new Error(`Anthropic count_tokens ${res.status}: ${await res.text()}`);
    const { input_tokens } = await res.json();
    cache.set(cacheKey, input_tokens);
    return input_tokens;
  };

  // The endpoint counts message framing too; subtract that fixed overhead by
  // measuring a one-token message.
  let overhead;
  return {
    ...base,
    available: true,
    async count(text) {
      overhead ??= (await request('a')) - 1;
      return (await request(text)) - overhead;
    },
  };
}

// ---- Open-weight models (offline after first download) ----------------------

async function huggingFaceTokenizer({ id, label, repo, family }) {
  const base = { id, label, family, source: 'huggingface', models: [repo] };
  let Tokenizer;
  try {
    ({ Tokenizer } = await import('@huggingface/tokenizers'));
  } catch {
    return { ...base, available: false, reason: 'npm i @huggingface/tokenizers to enable' };
  }
  try {
    // Downloaded once, then read from disk on later runs.
    const dir = new URL(`../node_modules/.cache/io-bench/${repo}/`, import.meta.url).pathname;
    const [tokenizerJson, tokenizerConfig] = await Promise.all(
      ['tokenizer.json', 'tokenizer_config.json'].map(async (file) => {
        const local = `${dir}${file}`;
        if (existsSync(local)) return JSON.parse(readFileSync(local, 'utf8'));
        const res = await fetch(`https://huggingface.co/${repo}/resolve/main/${file}`, {
          headers: process.env.HF_TOKEN ? { authorization: `Bearer ${process.env.HF_TOKEN}` } : {},
        });
        if (!res.ok) throw new Error(`${repo}/${file}: HTTP ${res.status}${res.status === 401 ? ' (gated: set HF_TOKEN)' : ''}`);
        const text = await res.text();
        mkdirSync(dir, { recursive: true });
        writeFileSync(local, text);
        return JSON.parse(text);
      })
    );
    const tokenizer = new Tokenizer(tokenizerJson, tokenizerConfig);
    return { ...base, available: true, count: (text) => tokenizer.encode(text).ids.length };
  } catch (err) {
    return { ...base, available: false, reason: err.message };
  }
}

/** Registry. Edit this list to change which model families the report covers. */
export async function loadTokenizers({ ids } = {}) {
  const all = await Promise.all([
    openaiEncoding('o200k_base', 'OpenAI o200k_base', ['GPT-4o', 'GPT-4.1', 'GPT-5 family'], 'gpt-tokenizer/encoding/o200k_base').then((t) => ({ available: true, ...t })),
    openaiEncoding('cl100k_base', 'OpenAI cl100k_base', ['GPT-4', 'GPT-3.5'], 'gpt-tokenizer/encoding/cl100k_base').then((t) => ({ available: true, ...t })),
    anthropicTokenizer(process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5-5'),
    huggingFaceTokenizer({ id: 'qwen3.8', label: 'Qwen 3.8', repo: 'Qwen/Qwen3.8-27B', family: 'Alibaba' }),
    huggingFaceTokenizer({ id: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro', repo: 'deepseek-ai/DeepSeek-V4-Pro', family: 'DeepSeek' }),
    huggingFaceTokenizer({ id: 'mistral-large-4', label: 'Mistral Large 4', repo: 'mistralai/Mistral-Large-4-1T-A52B', family: 'Mistral' }),
  ]);
  return ids ? all.filter((t) => ids.includes(t.id)) : all;
}
