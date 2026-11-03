/**
 * Keys and the values they take, per context. A plugin adds keys to any
 * context; the parser validates and coerces every key against the result.
 */

export type KeyContext =
  | 'character'
  | 'line'
  | 'span'
  | 'sound'
  | 'track'
  | 'play'
  | 'off'
  | 'set';

export const KEY_CONTEXTS: KeyContext[] = [
  'character',
  'line',
  'span',
  'sound',
  'track',
  'play',
  'off',
  'set',
];

export type KeySpec =
  | { kind: 'string' }
  | { kind: 'int' }
  | { kind: 'number'; min: number; max: number }
  | { kind: 'bool' }
  /** seconds, or m:ss */
  | { kind: 'time' }
  /** one value from a list, or from a named enum plugins can extend */
  | { kind: 'enum'; values: string[] | { named: string } }
  /** the name of a known track */
  | { kind: 'track' }
  /** a list of track names (`a,b` or `a+b`); `speech` means every track speech goes to */
  | { kind: 'tracks' };

export type Schema = Record<string, KeySpec>;

export const str = (): KeySpec => ({ kind: 'string' });
export const int = (): KeySpec => ({ kind: 'int' });
export const num = (min: number, max: number): KeySpec => ({ kind: 'number', min, max });
export const bool = (): KeySpec => ({ kind: 'bool' });
export const time = (): KeySpec => ({ kind: 'time' });
export const oneOf = (...values: string[]): KeySpec => ({ kind: 'enum', values });
export const named = (name: string): KeySpec => ({ kind: 'enum', values: { named: name } });
export const track = (): KeySpec => ({ kind: 'track' });
export const tracks = (): KeySpec => ({ kind: 'tracks' });

/** The core grammar's keys. Everything else comes from plugins. */
export const CORE_SCHEMAS: Record<KeyContext, Schema> = {
  character: {
    persona: str(),
    voice: str(),
    speaker: str(),
    emotion: str(),
    track: track(),
    seed: int(),
    gain: num(-60, 24),
  },
  line: { emotion: str(), seed: int(), track: track(), gain: num(-60, 24) },
  span: { emotion: str(), seed: int(), gain: num(-60, 24) },
  sound: {
    prompt: str(),
    file: str(),
    duration: num(0.05, 3600),
    seed: int(),
    loop: bool(),
    level: num(-80, 0),
    start: time(),
    layer: track(),
    track: track(),
  },
  track: {
    kind: oneOf('bed', 'oneshot'),
    level: num(-80, 0),
    volume: num(0, 4),
    gain: num(-60, 24),
    pan: num(-1, 1),
    duck: num(-60, 0),
    duck_under: tracks(),
    fade_in: num(0, 60),
    fade_out: num(0, 60),
    xfade: num(0, 30),
    tail: num(0, 60),
    loop: bool(),
    exclusive: bool(),
  },
  play: {
    at: num(-3600, 36000),
    volume: num(0, 4),
    pan: num(-1, 1),
    fade_in: num(0, 60),
    fade_out: num(0, 60),
    duration: num(0.05, 3600),
    seed: int(),
    start: time(),
    for: time(),
    hold: bool(),
    loop: bool(),
    noloop: bool(),
    level: num(-80, 0),
    xfade: num(0, 30),
  },
  off: { fade_out: num(0, 60) },
  set: { volume: num(0, 4), ramp: num(0, 600), at: num(-3600, 36000) },
};

/** Tracks every scene has without declaring them. */
export const CORE_TRACKS = ['dialogue', 'foreground', 'ambience', 'music', 'transition'];

/** Lowercase words that can never name a track. */
export const CORE_RESERVED = ['pause', 'off', 'track'];

/** Other spellings an author may use, mapped to the canonical key. */
export const ALIASES: Record<string, string> = {
  vol: 'volume',
  fadein: 'fade_in',
  fadeout: 'fade_out',
  dur: 'duration',
  from: 'start',
  length: 'for',
};

/** How a canonical key is shown back to an author. */
export function shown(key: string): string {
  if (key === 'volume') return 'vol';
  return key.replace(/_/g, '-');
}
