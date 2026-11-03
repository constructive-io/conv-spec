import { ConvPlugin } from '../plugin';
import { bool, named, num, Schema } from '../schema';

export interface EffectsOptions {
  /** reverb preset names a renderer offers (default: room, hall, cathedral, plate) */
  reverbPresets?: string[];
}

/** Per-character, per-line, per-span and per-track effect keys. */
export function effects(options: EffectsOptions = {}): ConvPlugin {
  const keys: Schema = {
    reverb: named('reverb'),
    reverb_mix: num(0, 1),
    delay: num(0.01, 5),
    delay_feedback: num(0, 0.95),
    delay_mix: num(0, 1),
    compress: bool(),
  };
  return {
    name: 'effects',
    enums: { reverb: options.reverbPresets ?? ['room', 'hall', 'cathedral', 'plate'] },
    keys: { character: keys, line: keys, span: keys, track: keys },
  };
}
