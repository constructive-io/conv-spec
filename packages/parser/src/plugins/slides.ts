import { ConvPlugin } from '../plugin';

/**
 * `[slide ID]` / `[slide ID step:N]` — a deck shows slide ID (and its Nth build)
 * from this point. Silent and timeless: a renderer records when it falls.
 */
export function slides(): ConvPlugin {
  return {
    name: 'slides',
    directives: {
      slide(args, ctx) {
        let id: string | null = null;
        let step = 0;
        let bad = false;
        for (const t of args.split(/[\s,]+/).filter(Boolean)) {
          const i = t.indexOf(':');
          if (i >= 0) {
            const k = t.slice(0, i);
            const v = t.slice(i + 1);
            if (k !== 'step') {
              ctx.error(
                `\`${k}:\` isn't a slide option — use \`[slide ID]\` or \`[slide ID step:N]\`` +
                  ctx.suggest(k, ['step'])
              );
              bad = true;
            } else if (!/^\d+$/.test(v)) {
              ctx.error(`\`step:${v}\` — step is a whole number of builds, e.g. \`step:1\``);
              bad = true;
            } else {
              step = parseInt(v, 10);
            }
          } else if (id === null && /^[a-z0-9][a-z0-9_-]*$/.test(t)) {
            id = t;
          } else {
            ctx.error(
              id === null
                ? `\`${t}\` — a slide id is lowercase, like the deck's ids (\`title\`, \`market-opportunity\`)`
                : `\`${t}\` — one slide per marker; put the next on its own line`
            );
            bad = true;
          }
        }
        if (id === null && !bad) {
          ctx.error('`[slide]` needs the slide\'s id, e.g. `[slide problem]` or `[slide problem step:1]`');
        }
        return { id, step };
      },
    },
  };
}
