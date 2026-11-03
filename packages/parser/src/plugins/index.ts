import { ConvPlugin } from '../plugin';
import { effects } from './effects';
import { slides } from './slides';
import { speakers } from './speakers';
import { video } from './video';

export { effects, EffectsOptions } from './effects';
export { slides } from './slides';
export { SPEAKER_WIDGETS, speakers } from './speakers';
export { video } from './video';

/** The plugins `parse` uses when none are given. */
export const defaultPlugins: ConvPlugin[] = [effects(), slides(), speakers(), video()];
