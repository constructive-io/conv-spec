import {
  CORE_RESERVED,
  CORE_SCHEMAS,
  CORE_TRACKS,
  KEY_CONTEXTS,
  KeyContext,
  KeySpec,
  Schema,
} from './schema';
import { Item, Scene, TrackItem } from './types';

export interface DirectiveContext {
  /** report a problem on this line; the directive produces no item */
  error(message: string): void;
  /** `. Did you mean `x`?` when something in `options` is close, else '' */
  suggest(word: string, options: Iterable<string>): string;
}

/**
 * Handles `[name args]` in the script body. Return the mark's data, or nothing
 * after reporting an error. The item is `{ type: 'mark', kind: name, data }`.
 */
export type Directive = (
  args: string,
  ctx: DirectiveContext
) => Record<string, unknown> | void;

export interface TrackRuleContext {
  error(message: string): void;
}

/** Validates (and may adjust) a directive on one named track. */
export type TrackRule = (item: TrackItem, ctx: TrackRuleContext) => void;

export interface FinalizeContext {
  /** report a problem against an item's line */
  problem(item: Item, message: string): void;
}

export interface ConvPlugin {
  name: string;
  /** keys accepted per context, merged over the core keys */
  keys?: Partial<Record<KeyContext, Schema>>;
  /** named enums; plugins naming the same enum add to its values */
  enums?: Record<string, string[]>;
  /** tracks every scene has without declaring them */
  tracks?: string[];
  /** lowercase words that can't name a track (directive names are added automatically) */
  reserved?: string[];
  /** `[name …]` body directives */
  directives?: Record<string, Directive>;
  /** extra validation for directives on a named track */
  trackRules?: Record<string, TrackRule>;
  /** a pass over the finished scene, before problems are reported */
  finalize?(scene: Scene, ctx: FinalizeContext): void;
}

export interface Registry {
  schemas: Record<KeyContext, Schema>;
  enums: Record<string, string[]>;
  tracks: string[];
  reserved: Set<string>;
  directives: Map<string, Directive>;
  trackRules: Map<string, TrackRule[]>;
  finalizers: Array<NonNullable<ConvPlugin['finalize']>>;
}

export function buildRegistry(plugins: ConvPlugin[]): Registry {
  const schemas = {} as Record<KeyContext, Schema>;
  for (const ctx of KEY_CONTEXTS) schemas[ctx] = { ...CORE_SCHEMAS[ctx] };
  const reg: Registry = {
    schemas,
    enums: {},
    tracks: [...CORE_TRACKS],
    reserved: new Set(CORE_RESERVED),
    directives: new Map(),
    trackRules: new Map(),
    finalizers: [],
  };
  const owner = new Map<string, string>();
  for (const p of plugins) {
    for (const [ctx, keys] of Object.entries(p.keys ?? {})) {
      Object.assign(reg.schemas[ctx as KeyContext], keys);
    }
    for (const [name, values] of Object.entries(p.enums ?? {})) {
      const have = reg.enums[name] ?? [];
      reg.enums[name] = [...have, ...values.filter((v) => !have.includes(v))];
    }
    for (const t of p.tracks ?? []) if (!reg.tracks.includes(t)) reg.tracks.push(t);
    for (const r of p.reserved ?? []) reg.reserved.add(r);
    for (const [name, fn] of Object.entries(p.directives ?? {})) {
      if (reg.directives.has(name)) {
        throw new Error(
          `conv plugins "${owner.get(name)}" and "${p.name}" both define the [${name}] directive`
        );
      }
      if (reg.tracks.includes(name)) {
        throw new Error(`conv plugin "${p.name}": [${name}] is already a track`);
      }
      reg.directives.set(name, fn);
      reg.reserved.add(name);
      owner.set(name, p.name);
    }
    for (const [name, rule] of Object.entries(p.trackRules ?? {})) {
      reg.trackRules.set(name, [...(reg.trackRules.get(name) ?? []), rule]);
    }
    if (p.finalize) reg.finalizers.push(p.finalize.bind(p));
  }
  return reg;
}

export function enumValues(reg: Registry, spec: KeySpec & { kind: 'enum' }): string[] {
  return Array.isArray(spec.values) ? spec.values : (reg.enums[spec.values.named] ?? []);
}

