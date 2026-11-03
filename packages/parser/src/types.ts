/** Where a play sits on the clock, when it isn't simply "here in the flow". */
export interface At {
  /** `offset`: seconds after this point (`at:+2`); `absolute`: from the scene start (`at:18.5`). */
  mode: 'offset' | 'absolute';
  seconds: number;
}

export type Value = string | number | boolean | string[] | At;

/** A declaration's settings or an item's overrides, keys normalised to snake_case. */
export type Config = Record<string, Value>;

export type Segment =
  | { type: 'text'; text: string; overrides: Config }
  | { type: 'break'; seconds: number }
  | { type: 'sfx'; sound: string; overrides: Config };

interface ItemBase {
  /** 1-based line in the source. */
  line: number;
}

/** `NAME[overrides]: text` */
export interface LineItem extends ItemBase {
  type: 'line';
  speaker: string;
  text: string;
  overrides: Config;
  segments: Segment[];
}

/** `[pause N]` */
export interface PauseItem extends ItemBase {
  type: 'pause';
  seconds: number;
}

/** `[SOUND …]`, played on its default track. */
export interface CueItem extends ItemBase {
  type: 'cue';
  sound: string;
  track: string;
  overrides: Config;
}

/** `[track SOUND …]`, `[track off]`, `[track key:value …]`, `[music: file …]` */
export interface TrackItem extends ItemBase {
  type: 'track';
  track: string;
  action: 'play' | 'off' | 'set';
  sound: string | null;
  /** only for the `[music: file …]` form, which names a file instead of a sound */
  file?: string;
  overrides: Config;
}

/** A silent, timeless marker produced by a directive plugin, e.g. `[slide intro]`. */
export interface MarkItem extends ItemBase {
  type: 'mark';
  kind: string;
  data: Record<string, unknown>;
}

export type Item = LineItem | PauseItem | CueItem | TrackItem | MarkItem;

export interface Problem {
  line: number | null;
  /** the trimmed source line */
  text: string | null;
  message: string;
}

export interface Declaration {
  line: number;
  /** set when the declaration came from an `@include` (the line is the include's) */
  include?: string;
}

export interface SceneIndex {
  character: Record<string, Declaration>;
  sound: Record<string, Declaration>;
  track: Record<string, Declaration>;
  /** first line each speaker speaks */
  speaker: Record<string, Declaration>;
  /** first line each directly-named file appears */
  file: Record<string, Declaration>;
}

export interface Scene {
  characters: Record<string, Config>;
  sounds: Record<string, Config>;
  /** tracks declared in `@tracks` (or included); built-in tracks need no entry */
  tracks: Record<string, Config>;
  items: Item[];
  /** empty unless parsed with `strict: false` */
  problems: Problem[];
  index: SceneIndex;
}
