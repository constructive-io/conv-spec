import { ConvError } from './errors';
import { IncludeResolver } from './include';
import { buildRegistry, ConvPlugin, Registry } from './plugin';
import { defaultPlugins } from './plugins';
import { Schema, shown } from './schema';
import { splitSegments } from './segments';
import { didYouMean } from './suggest';
import {
  Config,
  CueItem,
  Declaration,
  Item,
  Problem,
  Scene,
  SceneIndex,
  Segment,
  TrackItem,
} from './types';
import { check, CheckOptions, Pair, readConfig, readOverrides, readPlay } from './values';

export interface ParseOptions {
  /** a name for the script in error messages, and the `from` of its includes */
  source?: string;
  /** throw a ConvError listing every problem (default), or return them in `scene.problems` */
  strict?: boolean;
  /** defaults to `defaultPlugins`; pass `[...defaultPlugins, yours]` to extend */
  plugins?: ConvPlugin[];
  /** resolves `@include`; without one, an include is a problem */
  include?: IncludeResolver;
}

const INCLUDE_RE = /^@include\b\s*(.*)$/;
const PAUSE_RE = /^\[pause\s+([\d.]+)\]$/i;
const LEGACY_MUSIC_RE = /^\[music:\s*([^\s\]]+)\s*([^\]]*)\]$/i;
const DIRECTIVE_RE = /^\[([a-z][a-z0-9_-]*)(?:\s+([^\]]*))?\]$/;
const CUE_RE = /^\[([A-Z][A-Z0-9_-]*)(?:\s+([^\]]*))?\]$/;
const SOUND_NAME_RE = /^[A-Z][A-Z0-9_-]*$/;
const SOUND_DECL_RE = /^([A-Z][A-Z0-9_-]*)\s*:\s*\{(.+)\}\s*$/;
const CHAR_DECL_RE = /^([A-Z][A-Z0-9_]*)\s*:\s*\{(.+)\}\s*$/;
const TRACK_DECL_RE = /^([a-z][a-z0-9_-]*)\s*:\s*\{(.*)\}\s*$/;
const LINE_RE = /^([A-Z][A-Z0-9_]*)(?:\[([^\]]*)\])?\s*:\s*(.+)$/;
const V1_CHAR_RE = /^([A-Z][A-Z0-9_]*)\s*:\s*([a-z][a-z0-9_-]*)\s*$/;
const HEADERS = ['@characters', '@sounds', '@tracks', '@include'];

type Mode = null | 'chars' | 'sounds' | 'tracks' | 'body' | 'rejected';
type Kind = 'sound' | 'track';

/** Parse a `.conv` script. */
export function parse(text: string, options: ParseOptions = {}): Scene {
  const reg = buildRegistry(options.plugins ?? defaultPlugins);
  const stack = options.source ? [options.source] : [];
  return parseWith(text, options, reg, false, stack);
}

interface Included {
  sounds: Record<string, Config>;
  tracks: Record<string, Config>;
  origin: Map<string, { ref: string; line: number }>;
  problems: Problem[];
  clashes: Array<{ kind: Kind; name: string; problem: Problem }>;
}

function loadIncludes(
  lines: string[],
  options: ParseOptions,
  reg: Registry,
  stack: string[]
): Included {
  const inc: Included = { sounds: {}, tracks: {}, origin: new Map(), problems: [], clashes: [] };
  const resolver = options.include;
  const banks = () => resolver?.list?.() ?? [];
  for (let i = 0; i < lines.length; i++) {
    const s = lines[i].trim();
    if (s === '---') break;
    const m = INCLUDE_RE.exec(s);
    if (!m) continue;
    const problem = (message: string) => inc.problems.push({ line: i + 1, text: s, message });
    const ref = m[1].trim();
    if (!ref) {
      const list = banks();
      problem(
        '`@include` needs a bank, e.g. `@include podcast`' +
          (list.length ? `\nBanks: ${list.join(', ')}` : '')
      );
      continue;
    }
    if (!resolver) {
      problem(`can't include \`${ref}\` — this parser was given no include resolver`);
      continue;
    }
    const res = resolver.resolve(ref, stack[stack.length - 1]);
    if ('tried' in res) {
      const list = banks();
      problem(
        `can't find \`${ref}\` — looked for ${res.tried.join(', ')}` +
          didYouMean(ref, list) +
          (list.length ? `\nBanks: ${list.join(', ')}` : '')
      );
      continue;
    }
    if (stack.includes(res.id)) {
      problem(`\`@include ${ref}\` goes round in a circle: ${[...stack, res.id].join(' -> ')}`);
      continue;
    }
    let bank: Scene;
    try {
      bank = parseWith(res.text, { ...options, source: res.id, strict: true }, reg, true, [
        ...stack,
        res.id,
      ]);
    } catch (e) {
      if (!(e instanceof ConvError)) throw e;
      const detail = e.problems
        .map((p) => `line ${p.line}: ` + p.message.replace(/\n/g, '\n  '))
        .join('\n');
      problem(`\`${ref}\` (${res.id}) has problems — fix them there:\n${detail}`);
      continue;
    }
    const merge = (kind: Kind, got: Record<string, Config>, into: Record<string, Config>) => {
      for (const [name, cfg] of Object.entries(got)) {
        const prior = inc.origin.get(`${kind}:${name}`);
        if (prior) {
          inc.clashes.push({
            kind,
            name,
            problem: {
              line: i + 1,
              text: s,
              message:
                `${kind} \`${name}\` comes from both \`${prior.ref}\` and \`${ref}\` — which one ` +
                `is meant is ambiguous.\nDeclare \`${name}\` in this script to choose, or include ` +
                'only one of them.',
            },
          });
          continue;
        }
        into[name] = { ...cfg };
        inc.origin.set(`${kind}:${name}`, { ref, line: i + 1 });
      }
    };
    merge('sound', bank.sounds, inc.sounds);
    merge('track', bank.tracks, inc.tracks);
  }
  return inc;
}

function hintFor(s: string, mode: Mode): string {
  let m = /^pause\s+([\d.]+)$/i.exec(s);
  if (m) return `pauses go in brackets: \`[pause ${m[1]}]\` (this is the old v1 form)`;
  m = /^([A-Za-z][\w-]*)\s*:\s*\{/.exec(s);
  if (m && m[1] !== m[1].toUpperCase()) {
    return mode === 'tracks'
      ? `track names are lowercase: \`${m[1].toLowerCase()}: { … }\``
      : `names are UPPERCASE: \`${m[1].toUpperCase()}: { … }\``;
  }
  m = /^([A-Za-z][\w-]*)(\[[^\]]*\])?\s*:\s*(.+)$/.exec(s);
  if (m) {
    const name = m[1];
    if (name.includes('-')) {
      return `speaker names use letters, digits and _ — not -: \`${name.replace(/-/g, '_').toUpperCase()}: …\``;
    }
    if (name !== name.toUpperCase()) {
      return `speaker names are UPPERCASE: \`${name.toUpperCase()}${m[2] ?? ''}: ${m[3].slice(0, 30)}…\``;
    }
  }
  m = /^\[([A-Za-z][\w-]*)/.exec(s);
  if (m) {
    return (
      `\`[${m[1]} …]\` — sound names are UPPERCASE (\`[${m[1].toUpperCase()}]\`), ` +
      `track directives lowercase (\`[${m[1].toLowerCase()} SOUND]\`)`
    );
  }
  if (mode === 'tracks') return 'inside @tracks every line is `name: { key: value, … }`';
  return (
    'expected one of: `NAME: text`, `NAME[emotion]: text`, `[pause N]`, `[SOUND]`, ' +
    '`[track SOUND]`, `# comment`, or a header (@characters, @sounds, @tracks, ---)'
  );
}

function parseWith(
  text: string,
  options: ParseOptions,
  reg: Registry,
  fragment: boolean,
  stack: string[]
): Scene {
  const lines = text.split(/\r?\n/);
  const characters: Record<string, Config> = {};
  const sounds: Record<string, Config> = {};
  const tracks: Record<string, Config | null> = {};
  const items: Item[] = [];
  const problems: Problem[] = [];
  const refs: Array<{ line: number; text: string; sound: string }> = [];
  const index: SceneIndex = { character: {}, sound: {}, track: {}, speaker: {}, file: {} };
  const declare = (kind: keyof SceneIndex, name: string, d: Declaration, keepFirst = false) => {
    if (!(keepFirst && index[kind][name])) index[kind][name] = d;
  };

  const inc = loadIncludes(lines, options, reg, stack);
  Object.assign(sounds, inc.sounds);
  Object.assign(tracks, inc.tracks);
  problems.push(...inc.problems);
  for (const [key, o] of inc.origin) {
    const [kind, name] = key.split(/:(.*)/s) as [Kind, string];
    declare(kind, name, { line: o.line, include: o.ref });
  }

  // first pass: track names, so anything above @tracks can already name one
  {
    let m: Mode = null;
    for (const raw of lines) {
      const s = raw.trim();
      if (s === '@tracks') m = 'tracks';
      else if (s.startsWith('@') || s === '---') m = null;
      else if (m === 'tracks') {
        const tm = /^([a-z][a-z0-9_-]*)\s*:\s*\{/.exec(s);
        if (tm && !reg.reserved.has(tm[1]) && !(tm[1] in tracks)) tracks[tm[1]] = null;
      }
    }
  }
  const allTracks = () => new Set([...reg.tracks, ...Object.keys(tracks)]);
  const knownTrack = (n: string) => reg.tracks.includes(n) || n in tracks;
  const opts = (what: string, context?: string): CheckOptions => ({
    reg,
    tracks: allTracks(),
    what,
    context,
  });

  let mode: Mode = null;
  let bodyStarted = false;

  for (let i = 0; i < lines.length; i++) {
    const lineno = i + 1;
    const s = lines[i].trim();
    const errs: string[] = [];
    const flush = () => {
      for (const message of errs) problems.push({ line: lineno, text: s, message });
    };
    const problem = (message: string) => problems.push({ line: lineno, text: s, message });

    if (!s || s.startsWith('#')) continue;
    if (INCLUDE_RE.test(s)) {
      if (mode === 'body' || bodyStarted) problem('`@include` belongs in the header, above `---`');
      continue;
    }
    if (fragment && (s === '@characters' || s === '@voices' || s === '---')) {
      problem(
        'a sound bank holds only @sounds and @tracks (and @include) — characters and the ' +
          'script belong in the .conv'
      );
      mode = 'rejected';
      continue;
    }
    if (s === '@characters' || s === '@voices') {
      mode = 'chars';
      continue;
    }
    if (s === '@sounds') {
      mode = 'sounds';
      continue;
    }
    if (s === '@tracks') {
      mode = 'tracks';
      continue;
    }
    if (s === '---') {
      mode = 'body';
      continue;
    }
    if (s.startsWith('@')) {
      problem(
        `unknown header \`${s}\` — headers are @characters, @sounds, @tracks and @include` +
          didYouMean(s, HEADERS)
      );
      continue;
    }
    if (fragment && mode !== 'sounds' && mode !== 'tracks') {
      if (mode !== 'rejected') {
        problem('a sound bank holds only @sounds and @tracks — put this line under one of those headers');
      }
      continue;
    }

    let m = PAUSE_RE.exec(s);
    if (m) {
      items.push({ type: 'pause', line: lineno, seconds: Number(m[1]) });
      bodyStarted = true;
      continue;
    }
    if (/^\[pause\b/i.test(s)) {
      problem('`[pause N]` needs seconds, e.g. `[pause 1.5]`');
      continue;
    }

    if (mode === 'tracks') {
      m = TRACK_DECL_RE.exec(s);
      if (m && reg.reserved.has(m[1])) {
        problem(`\`${m[1]}\` is a reserved word and can't name a track — pick another name`);
        continue;
      }
      if (m) {
        const pairs = readConfig(m[2], errs);
        tracks[m[1]] = check(pairs, reg.schemas.track, opts(`track \`${m[1]}\``), errs);
        declare('track', m[1], { line: lineno });
        flush();
        continue;
      }
    }

    m = LEGACY_MUSIC_RE.exec(s);
    if (m) {
      const overrides = check(readPlay(m[2]), reg.schemas.play, opts('`[music: …]`'), errs);
      items.push({
        type: 'track',
        line: lineno,
        track: 'music',
        action: 'play',
        sound: null,
        file: m[1],
        overrides,
      });
      declare('file', m[1], { line: lineno }, true);
      flush();
      continue;
    }

    m = DIRECTIVE_RE.exec(s);
    const directive = m && reg.directives.get(m[1]);
    if (m && directive) {
      const data = directive((m[2] ?? '').trim(), {
        error: (msg) => errs.push(msg),
        suggest: (w, o) => didYouMean(w, o),
      });
      if (!errs.length) items.push({ type: 'mark', line: lineno, kind: m[1], data: data || {} });
      bodyStarted = true;
      flush();
      continue;
    }
    if (m && !reg.reserved.has(m[1])) {
      const name = m[1];
      if (!knownTrack(name)) {
        const upper = name.toUpperCase();
        problem(
          `unknown track \`${name}\`` +
            (upper in sounds
              ? ` — sound names are UPPERCASE: \`[${upper}${m[2] ? ' ' + m[2] : ''}]\``
              : didYouMean(name, allTracks())) +
            `\nBuilt-in tracks: ${reg.tracks.join(', ')}. Declare others under @tracks, ` +
            `e.g. \`${name}: { level: -24 }\``
        );
        continue;
      }
      items.push(trackDirective(name, m[2] ?? '', lineno, s, errs));
      flush();
      continue;
    }

    if (mode === 'sounds') {
      m = SOUND_DECL_RE.exec(s);
      if (m) {
        const cfg = check(readConfig(m[2], errs), reg.schemas.sound, opts(`sound \`${m[1]}\``), errs);
        if (!cfg.prompt && !cfg.file) {
          errs.push(
            `sound \`${m[1]}\` needs a source: \`file: path/to.mp3\` or \`prompt: "what it sounds like"\``
          );
        } else if (cfg.prompt && cfg.file) {
          errs.push(`sound \`${m[1]}\` has both \`file:\` and \`prompt:\` — keep one`);
        }
        sounds[m[1]] = cfg;
        declare('sound', m[1], { line: lineno });
        flush();
        continue;
      }
    }

    if (mode !== 'body') {
      m = CHAR_DECL_RE.exec(s);
      if (m) {
        const cfg = check(
          readConfig(m[2], errs),
          reg.schemas.character,
          opts(`character \`${m[1]}\``),
          errs
        );
        const alias = cfg.voice ?? cfg.speaker;
        if (alias && !cfg.persona) cfg.persona = String(alias).toLowerCase();
        characters[m[1]] = cfg;
        declare('character', m[1], { line: lineno });
        mode = 'chars';
        flush();
        continue;
      }
    }

    if (mode === 'chars' && !bodyStarted) {
      m = V1_CHAR_RE.exec(s);
      if (m) {
        problem(
          `character definitions need braces: \`${m[1]}: { persona: ${m[2]} }\` ` +
            `(\`${m[1]}: ${m[2]}\` is the old v1 form)`
        );
        continue;
      }
    }

    m = CUE_RE.exec(s);
    if (m) {
      const overrides = check(readPlay(m[2] ?? ''), reg.schemas.play, opts(`[${m[1]}]`), errs);
      refs.push({ line: lineno, text: s, sound: m[1] });
      items.push({ type: 'cue', line: lineno, sound: m[1], track: 'foreground', overrides });
      flush();
      continue;
    }

    m = LINE_RE.exec(s);
    if (m) {
      mode = 'body';
      bodyStarted = true;
      const lineText = m[3].trim();
      const overrides = check(
        readOverrides(m[2] ?? '', errs),
        reg.schemas.line,
        opts(`\`${m[1]}[…]\``, 'line'),
        errs
      );
      const segments: Segment[] = splitSegments(lineText).map((seg) => {
        if (seg.type === 'break') return { type: 'break', seconds: seg.seconds };
        if (seg.type === 'sfx') {
          refs.push({ line: lineno, text: s, sound: seg.sound });
          return {
            type: 'sfx',
            sound: seg.sound,
            overrides: check(readPlay(seg.raw), reg.schemas.play, opts(`<sfx ${seg.sound}>`), errs),
          };
        }
        const ov = seg.raw
          ? check(
            readOverrides(seg.raw, errs),
            reg.schemas.span,
            opts('an inline `{…: …}` span', 'span'),
            errs
          )
          : {};
        return { type: 'text', text: seg.text, overrides: ov };
      });
      items.push({ type: 'line', line: lineno, speaker: m[1], text: lineText, overrides, segments });
      declare('speaker', m[1], { line: lineno }, true);
      flush();
      continue;
    }

    problem(hintFor(s, mode));
  }

  /** `[music BED fade-in:3]`, `[music off]`, `[music vol:0.5 ramp:2]` */
  function trackDirective(
    name: string,
    rest: string,
    lineno: number,
    s: string,
    errs: string[]
  ): TrackItem {
    let tokens = rest
      .trim()
      .split(/[,\s]+/)
      .filter(Boolean);
    let sound: string | null = null;
    let action: TrackItem['action'] = 'set';
    if (tokens.length && ['off', 'none', 'stop'].includes(tokens[0].toLowerCase())) {
      action = 'off';
      tokens = tokens.slice(1);
      if (tokens.length && SOUND_NAME_RE.test(tokens[0])) [sound, ...tokens] = tokens;
    } else if (tokens.length && SOUND_NAME_RE.test(tokens[0])) {
      action = 'play';
      [sound, ...tokens] = tokens;
    }
    const pairs: Pair[] = readPlay(tokens.join(','));
    let schema: Schema;
    if (action === 'play') schema = reg.schemas.play;
    else if (action === 'off') schema = reg.schemas.off;
    else if (!bodyStarted) schema = { ...reg.schemas.track, ...reg.schemas.set };
    else schema = reg.schemas.set;

    if (action === 'set') {
      if (!pairs.length) {
        errs.push(
          `\`[${name}]\` does nothing — play a sound (\`[${name} SOUND]\`), stop (\`[${name} off]\`), ` +
            `or set something (\`[${name} vol:0.5]\`)`
        );
      } else if (bodyStarted) {
        const extra = pairs.filter((p) => !(p.key in schema));
        if (extra.length && extra.every((p) => p.key in reg.schemas.track)) {
          const e = extra[0];
          errs.push(
            `\`${extra.map((p) => shown(p.key)).join(', ')}\` can't change mid-scene — only \`vol\` ` +
              `(with \`ramp\`) moves over time.\nPut it on the track instead: under @tracks, ` +
              `\`${name}: { ${shown(e.key)}: ${e.value} }\``
          );
          return { type: 'track', line: lineno, track: name, action, sound, overrides: {} };
        }
      }
    }
    const what =
      action === 'play' ? `a [${name} …] play` : action === 'off' ? `[${name} off]` : `[${name} …]`;
    const overrides = check(pairs, schema, opts(what), errs);
    const item: TrackItem = { type: 'track', line: lineno, track: name, action, sound, overrides };
    for (const rule of reg.trackRules.get(name) ?? []) rule(item, { error: (msg) => errs.push(msg) });
    if (sound) refs.push({ line: lineno, text: s, sound });
    return item;
  }

  // two banks defining one name is an error unless the script settles it
  for (const c of inc.clashes) {
    if (index[c.kind][c.name]?.include !== undefined) problems.push(c.problem);
  }

  for (const r of refs) {
    if (!(r.sound in sounds)) {
      problems.push({
        line: r.line,
        text: r.text,
        message:
          `sound \`${r.sound}\` isn't declared under @sounds` +
          didYouMean(r.sound, Object.keys(sounds)) +
          `\nAdd it, e.g. \`${r.sound}: { file: sounds/${r.sound.toLowerCase()}.wav }\` ` +
          `or \`${r.sound}: { prompt: "…", duration: 3 }\``,
      });
    }
  }

  // a bare [CUE] plays on the track its sound names, else on foreground
  for (const it of items) {
    if (it.type !== 'cue') continue;
    const cfg = sounds[it.sound] ?? {};
    const lay = (cfg.track ?? cfg.layer) as string | undefined;
    if (lay && knownTrack(lay)) (it as CueItem).track = lay;
  }

  const scene: Scene = {
    characters,
    sounds,
    tracks: Object.fromEntries(Object.entries(tracks).map(([k, v]) => [k, v ?? {}])),
    items,
    problems,
    index,
  };
  for (const finalize of reg.finalizers) {
    finalize(scene, {
      problem: (item, message) =>
        problems.push({ line: item.line, text: lines[item.line - 1]?.trim() ?? null, message }),
    });
  }

  if (problems.length && options.strict !== false) throw new ConvError(problems, options.source);
  scene.problems = new ConvError(problems).problems;
  return scene;
}
