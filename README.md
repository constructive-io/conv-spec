# conv-spec

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/conv-spec/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/conv-spec/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
  <a href="https://github.com/constructive-io/conv-spec/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
</p>

`.conv` is a plain-text screenplay format for multi-voice audio: a cast, a list
of sounds, and a script of dialogue, pauses and cues. It says who speaks, what
they say and how, and what is heard around them — never how any of it is
produced. Voices, sound, mixing and playback belong to the renderer.

```
@characters
ALICE: { persona: alice }
BOB:   { persona: bob, emotion: warm, reverb: room }

@sounds
CREAK: { prompt: "an old floorboard creaking", duration: 2 }
RAIN:  { file: sounds/rain.wav, loop: true, track: ambience }
---
[RAIN]
ALICE: Did you hear that?
BOB[excited]: I did! <break 0.4> It came from the attic.
[CREAK hold]
ALICE[whisper, seed:207]: Then we go up {firm: together}.
[pause 1.5]
```

## What's here

| | |
|---|---|
| [`SPEC.md`](./SPEC.md) | the grammar |
| [`__fixtures__/`](./__fixtures__) | conformance: scripts and exactly what they parse to, or the errors they report |
| [`@constructive-io/conv-parser`](./packages/parser) | the reference parser: text in, a JSON scene out, with a plugin system |
| [`@constructive-io/conv-cli`](./packages/cli) | `conv check` and `conv parse` |

## Quick start

```sh
npx @constructive-io/conv-cli check scripts/*.conv
npx @constructive-io/conv-cli parse scripts/attic.conv > attic.json
```

```ts
import { parse } from '@constructive-io/conv-parser';

const scene = parse(text, { source: 'attic.conv' });
for (const item of scene.items) {
  if (item.type === 'line') console.log(item.speaker, item.segments);
}
```

A script with mistakes throws a `ConvError` listing every one of them — line,
what is wrong, how to fix it:

```
attic.conv: 2 problems

  line 9: [music BED fade-ot:3]
    unknown key `fade-ot` on a [music …] play. Did you mean `fade-out`?
      Valid keys: at, duration, fade-in, fade-out, for, hold, level, loop, noloop, pan, seed, start, vol, xfade

  line 11: [GLAS]
    sound `GLAS` isn't declared under @sounds. Did you mean `GLASS`?
```

## Extending the format

The core grammar is small; effects, slide markers, on-screen speakers and video
are plugins, and you can add your own — keys, enum values, tracks and
`[directives]`. See [the parser's README](./packages/parser#plugins).

## Development

```sh
pnpm install
pnpm build
pnpm test
UPDATE_FIXTURES=1 pnpm --filter @constructive-io/conv-parser test   # after a deliberate grammar change
```

## License

MIT

## Credits

**🛠 Built by the [Constructive](https://constructive.io) team — creators of modular Postgres tooling for secure, composable backends. If you like our work, contribute on [GitHub](https://github.com/constructive-io).**

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
