import { ConvPlugin } from '../plugin';

/**
 * `[video CLIP]` / `[video CLIP start:2, for:4]` — a clip takes the screen and the
 * scene waits for it. `video` is a built-in track; the sound must be a `file:`.
 */
export function video(): ConvPlugin {
  const allowed = ['hold', 'start', 'for', 'volume'];
  return {
    name: 'video',
    tracks: ['video'],
    trackRules: {
      video(item, ctx) {
        const ov = item.overrides;
        const bad = Object.keys(ov).filter((k) => !allowed.includes(k));
        if (item.action !== 'play' || !item.sound) {
          ctx.error(
            '`[video …]` plays one clip, e.g. `[video COVER]` — it can\'t be stopped or set; a clip ' +
              'plays its length (trim with `start:`/`for:`)'
          );
        } else if (ov.at !== undefined) {
          ctx.error('a video takes the screen, so it can\'t overlap anything — drop `at:`');
        } else if (bad.length) {
          ctx.error(
            `\`${bad.join(', ')}\` doesn't apply to a video clip — it takes \`start:\`, \`for:\` and \`vol:\``
          );
        }
        ov.hold = true;
      },
    },
    finalize(scene, ctx) {
      for (const item of scene.items) {
        if (item.type !== 'track' || item.track !== 'video' || !item.sound) continue;
        const sound = scene.sounds[item.sound];
        if (sound && !sound.file) {
          ctx.problem(
            item,
            `\`${item.sound}\` is generated (\`prompt:\`), but \`[video …]\` needs a video file: ` +
              `\`${item.sound}: { file: path/to/clip.mp4 }\``
          );
        }
      }
    },
  };
}
