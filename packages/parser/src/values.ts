/**
 * Reading `key: value` lists and checking them against a schema.
 *
 * Three surface styles share one validator:
 *   config     `{ persona: dan, prompt: "rain, distant thunder" }`   commas, quotes allowed
 *   overrides  `[excited, seed:303]`                                  commas; a bareword is an emotion
 *   play       `[GLASS vol:0.9, pan:0.2 hold]`                         commas or spaces; a bareword is a flag
 */
import { enumValues, Registry } from './plugin';
import { ALIASES, KeySpec, Schema, shown } from './schema';
import { didYouMean } from './suggest';
import { At, Config, Value } from './types';

export interface Pair {
  /** canonical key */
  key: string;
  /** what the author typed */
  typed: string;
  /** raw text, or `true` for a bareword flag */
  value: string | true;
}

const canonical = (k: string): string => {
  const key = k.trim().toLowerCase().replace(/-/g, '_');
  return ALIASES[key] ?? key;
};

function pair(part: string): Pair {
  const i = part.indexOf(':');
  if (i < 0) return { key: canonical(part), typed: part.trim(), value: true };
  const typed = part.slice(0, i).trim();
  return { key: canonical(typed), typed, value: part.slice(i + 1).trim() };
}

/** Split on commas outside quotes, dropping the quote characters themselves. */
export function splitTop(raw: string): string[] {
  const out: string[] = [];
  let buf = '';
  let quote: string | null = null;
  for (const ch of raw) {
    if (quote) {
      if (ch === quote) quote = null;
      else buf += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === ',') {
      out.push(buf);
      buf = '';
    } else {
      buf += ch;
    }
  }
  out.push(buf);
  return out;
}

export function readConfig(raw: string, errs: string[]): Pair[] {
  const pairs: Pair[] = [];
  for (const part of splitTop(raw)) {
    if (!part.trim()) continue;
    const p = pair(part);
    if (p.value === true) {
      errs.push(`\`${p.typed}\` needs a value, e.g. \`${p.typed}: …\``);
      continue;
    }
    pairs.push(p);
  }
  return pairs;
}

export function readOverrides(raw: string, errs: string[]): Pair[] {
  const pairs: Pair[] = [];
  const barewords: string[] = [];
  for (const part of raw.split(',')) {
    if (!part.trim()) continue;
    const p = pair(part);
    if (p.value === true) barewords.push(p.typed.toLowerCase());
    else pairs.push(p);
  }
  if (barewords.length > 1) {
    errs.push(
      `\`[${raw}]\` names ${barewords.length} emotions (${barewords.join(', ')}) — a line has one. ` +
        `Pick one, e.g. \`[${barewords[0]}]\``
    );
  }
  if (barewords.length) {
    const typed = barewords[barewords.length - 1];
    pairs.push({ key: 'emotion', typed: 'emotion', value: typed });
  }
  return pairs;
}

export function readPlay(raw: string): Pair[] {
  return (raw || '')
    .split(/[,\s]+/)
    .filter((p) => p.trim())
    .map(pair);
}

export function seconds(v: string): number {
  const s = String(v).trim();
  if (!s) return NaN;
  if (s.includes(':')) {
    return s.split(':').reduce((total, part) => {
      return part.trim() === '' ? NaN : total * 60 + Number(part);
    }, 0);
  }
  return Number(s);
}

const BOOLS: Record<string, boolean> = {
  true: true,
  yes: true,
  on: true,
  false: false,
  no: false,
  off: false,
};

export interface CheckOptions {
  reg: Registry;
  /** every track name in scope: built-in, declared and included */
  tracks: Set<string>;
  /** "track `crowd`", "a [music …] play" — used in unknown-key messages */
  what: string;
  /** the context the schema is for, for context-specific hints */
  context?: string;
}

type Coerced = { value: Value } | { error: string };

function coerce(p: Pair, spec: KeySpec, opts: CheckOptions): Coerced {
  const k = p.typed;
  const raw = p.value;
  const text = raw === true ? 'true' : raw;
  switch (spec.kind) {
  case 'string':
    return text.trim() ? { value: text } : { error: `\`${shown(p.key)}\` is empty` };
  case 'bool': {
    const b = BOOLS[text.toLowerCase()];
    return b === undefined
      ? { error: `\`${k}:${text}\` — use true or false (yes/no also work)` }
      : { value: b };
  }
  case 'int':
    if (raw === true) break;
    if (/^-?\d+$/.test(text)) return { value: parseInt(text, 10) };
    return {
      error:
          p.key === 'seed'
            ? `\`${k}:${text}\` — a seed must be a whole number, e.g. \`seed:303\``
            : `\`${k}:${text}\` — ${k} must be a whole number`,
    };
  case 'time': {
    if (raw === true) break;
    const s = seconds(text);
    return Number.isFinite(s)
      ? { value: s }
      : { error: `\`${k}:${text}\` — ${k} must be seconds or m:ss, e.g. \`${k}:0:15\`` };
  }
  case 'number': {
    if (raw === true) break;
    const n = text.trim() === '' ? NaN : Number(text);
    if (!Number.isFinite(n)) return { error: `\`${k}:${text}\` — ${k} must be a number` };
    if (n < spec.min || n > spec.max) {
      return { error: `\`${k}:${text}\` — out of range; use ${spec.min} to ${spec.max}` };
    }
    return { value: n };
  }
  case 'enum': {
    if (raw === true) break;
    const options = enumValues(opts.reg, spec);
    const v = text.toLowerCase();
    if (options.includes(v)) return { value: v };
    return {
      error: `\`${k}:${text}\` — not one of: ${options.join(', ')}` + didYouMean(v, options),
    };
  }
  case 'track':
  case 'tracks': {
    if (raw === true) break;
    const names =
        spec.kind === 'tracks'
          ? text
            .split(/[,+]/)
            .map((n) => n.trim())
            .filter(Boolean)
          : [text];
    for (const n of names) {
      if (spec.kind === 'tracks' && n === 'speech') continue;
      if (!opts.tracks.has(n)) {
        return {
          error:
              `\`${k}:${text}\` — no track named \`${n}\`. Tracks: ${[...opts.tracks].sort().join(', ')}` +
              didYouMean(n, opts.tracks) +
              `\nDeclare new tracks under @tracks, e.g. \`${n}: { level: -24 }\``,
        };
      }
    }
    return { value: spec.kind === 'tracks' ? names : text };
  }
  }
  return { error: `\`${k}\` needs a value, e.g. \`${k}:…\`` };
}

function readAt(p: Pair): Coerced {
  const text = p.value === true ? '' : p.value;
  const n = text === '' ? NaN : Number(text);
  if (!Number.isFinite(n)) {
    return {
      error:
        `\`at:${text}\` — at must be seconds: \`at:18.5\` from the start, ` +
        `or \`at:+2\` / \`at:-2\` from this point`,
    };
  }
  const at: At = { mode: /^[+-]/.test(text) ? 'offset' : 'absolute', seconds: n };
  return { value: at };
}

/** Validate and coerce pairs against a schema. Problems go to `errs`; bad keys are left out. */
export function check(pairs: Pair[], schema: Schema, opts: CheckOptions, errs: string[]): Config {
  const out: Config = {};
  for (const p0 of pairs) {
    let p = p0;
    // on a play or a fader move, `gain` is a linear multiplier: the same as vol
    if (p.key === 'gain' && !('gain' in schema) && 'volume' in schema) p = { ...p, key: 'volume' };
    const spec = schema[p.key];
    if (!spec) {
      if ((opts.context === 'line' || opts.context === 'span') && ['persona', 'voice', 'speaker'].includes(p.key)) {
        errs.push(
          `\`${p.typed}\` can't be changed per line — set it on the character under @characters, ` +
            'e.g. `DAN: { persona: dan }`'
        );
        continue;
      }
      errs.push(
        `unknown key \`${shown(p.key)}\` on ${opts.what}` +
          didYouMean(p.key, Object.keys(schema), shown) +
          `\nValid keys: ${Object.keys(schema).sort().map(shown).join(', ')}`
      );
      continue;
    }
    const r = p.key === 'at' ? readAt(p) : coerce(p, spec, opts);
    if ('error' in r) errs.push(r.error);
    else out[p.key] = r.value;
  }
  return out;
}
