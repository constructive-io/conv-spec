import { ConvPlugin } from '../plugin';
import { str } from '../schema';

/** What a player can show for whoever is speaking. */
export const SPEAKER_WIDGETS = ['faces', 'lower-third', 'waveform', 'captions'];
const ALWAYS = 'lower-third:always';
/** `faces` moves the mouth with the voice; `faces:still` shows the face without it. */
const STILL = 'faces:still';

/**
 * `[speakers faces lower-third waveform captions]`, `[speakers all]`, `[speakers off]`
 * — which on-screen widgets a player shows from here. Characters gain `name:` and
 * `title:` for the lower-third.
 */
export function speakers(): ConvPlugin {
  const choices = [...SPEAKER_WIDGETS, ALWAYS, STILL, 'all', 'off'];
  return {
    name: 'speakers',
    keys: { character: { name: str(), title: str() } },
    directives: {
      speakers(args, ctx) {
        const want = args
          .toLowerCase()
          .split(/[\s,+]+/)
          .filter(Boolean)
          .map((w) => (w === 'lower-third:first' ? 'lower-third' : w === 'faces:talking' ? 'faces' : w));
        if (!want.length) {
          ctx.error(
            '`[speakers]` needs what to show, e.g. `[speakers faces lower-third]`, `[speakers all]` ' +
              `or \`[speakers off]\` — widgets: ${SPEAKER_WIDGETS.join(', ')}`
          );
        }
        for (const w of want.filter((x) => !choices.includes(x))) {
          ctx.error(
            `\`${w}\` isn't a speaker widget` +
              ctx.suggest(w, choices) +
              ` — widgets: ${SPEAKER_WIDGETS.join(', ')} (\`${ALWAYS}\` to show it on every line, ` +
              `\`${STILL}\` for a face that doesn't move its mouth), or \`all\` / \`off\``
          );
        }
        if ((want.includes('off') || want.includes('all')) && want.length > 1) {
          ctx.error('`off` and `all` stand alone: `[speakers off]`, `[speakers all]`');
        }
        let show: string[];
        if (want[0] === 'off' && want.length === 1) show = [];
        else if (want[0] === 'all' && want.length === 1) show = [...SPEAKER_WIDGETS];
        else show = [...SPEAKER_WIDGETS, ALWAYS, STILL].filter((w) => want.includes(w));
        if (show.includes(ALWAYS)) show = show.filter((w) => w !== 'lower-third');
        if (show.includes(STILL)) show = show.filter((w) => w !== 'faces');
        return { show };
      },
    },
  };
}
