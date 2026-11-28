# Conversation Format

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/conversation-format/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/conversation-format/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
  <a href="https://github.com/constructive-io/conversation-format/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
</p>

`.conv` is a plain-text screenplay format for multi-voice audio: a cast, a list
of sounds, and a script of dialogue, pauses and cues. It says who speaks, what
they say and how, and what is heard around them — never how any of it is
produced. Voices, sound, mixing and playback belong to the renderer.

```bash
npx skills add constructive-io/conversation-format
```

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

## Features

* 🎭 **[A cast of characters](./SPEC.md#characters)** — `@characters` gives each speaker a `persona`, a default `emotion`, a `seed` and a `track`; what voice a persona has is the renderer's to decide
* 💬 **[Dialogue with direction](./SPEC.md#dialogue-overrides)** — `BOB[excited, seed:303]: …` sets the emotion and the take of one line; `<break 0.4>`, `{firm: together}` and `<sfx CREAK>` work inside it
* 🔊 **[Sounds from a file or a description](./SPEC.md#sounds)** — `@sounds` declares each one with a `file:` or a `prompt:`; `[CREAK hold]` plays it where it falls in the script, with `at`, `vol`, `pan` and fades
* 🎚️ **[Tracks](./SPEC.md#7-tracks)** — `dialogue`, `foreground`, `ambience`, `music` and `transition` are built in and `@tracks` declares more, with `level`, `pan` and `duck`; `[music BED fade-in:3]` and `[music off]` start and stop a bed
* 🏦 **[Sound banks](./SPEC.md#8-banks-include)** — `@include studio` pulls `@sounds` and `@tracks` from a `.sounds` file shared between scripts, and the script's own declaration wins
* 🎛️ **[Effects](./SPEC.md#10-effects)** — `reverb`, `delay` and `compress` on a character, a line, a span or a track
* 📍 **[Marks for the screen](./SPEC.md#11-extensions)** — `[slide ID step:N]`, `[speakers faces captions]` and `[video CLIP]` say what a player shows and when; a mark takes no time
* 🧩 **[Plugins](./packages/parser#plugins)** — effects, slides, speakers and video are plugins of the reference parser, and your own can add keys, enum values, tracks and `[directives]`
* 🚨 **[Every problem at once](./SPEC.md#12-errors)** — a parser reports each mistake with its line, what is wrong and how to fix it; nothing is silently ignored or defaulted
* 📦 **[A reference parser](./packages/parser)** — `@conversation/spec` is TypeScript with no dependencies: `parse(text)` returns [the scene](./SPEC.md#13-the-parsed-scene) as JSON
* ⌨️ **[A command line](./packages/cli)** — `conv check` reports the problems in every script it is given and exits 1 if there are any; `conv parse` prints the scene as JSON, and `--banks <dir>` says where `@include` looks
* ✅ **[Conformance fixtures](./__fixtures__)** — scripts with exactly what they parse to, or the errors they report, so any parser can be held to the format
* 🔁 **[Any renderer](#implementations)** — the format says what is heard and never how it is produced; [Constructive Media](https://github.com/constructive-io/media-engine) is one renderer, and the fixtures are there for the next
* 🤖 **[An agent skill](#working-with-an-ai-agent)** — `npx skills add constructive-io/conversation-format` teaches a coding agent to write scripts and check them

## What's here

| | |
|---|---|
| [`SPEC.md`](./SPEC.md) | the grammar |
| [`__fixtures__/`](./__fixtures__) | conformance: scripts and exactly what they parse to, or the errors they report |
| [`@conversation/spec`](./packages/parser) | the reference parser: text in, a JSON scene out, with a plugin system |
| [`@conversation/cli`](./packages/cli) | `conv check` and `conv parse` |
| [`.agents/skills/conv`](./.agents/skills/conv/SKILL.md) | a skill that teaches an AI agent to write scripts and check them |

## Quick start

```sh
npx @conversation/cli check scripts/*.conv
npx @conversation/cli parse scripts/attic.conv > attic.json
```

```ts
import { parse } from '@conversation/spec';

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

## Implementations

A parser tells you what a script says. A renderer makes it heard.

| | |
|---|---|
| [`@conversation/spec`](./packages/parser) | the reference parser, in TypeScript |
| [Constructive Media](https://github.com/constructive-io/media-engine) | a renderer: `media say scene.conv out/scene.flac` says every line through a speech model of your choosing, checks each one by listening back, and mixes the scene. `media film` then records a page following it, as a video. Its own parser, in Python, is held to the fixtures here |

Written another one? The [conformance fixtures](./__fixtures__) are how to know it agrees.

Starting points, each a script with what it needs beside it:

| | |
|---|---|
| [media-engine-boilerplates](https://github.com/constructive-io/media-engine-boilerplates) | a workspace, and what goes in one: a narrated deck, a walkthrough of an application, an animation, a document that prints as a PDF and is filmed being read aloud; and a library of voices, sounds and faces, with the consent for each voice written down |

## Working with an AI agent

The `conv` skill at `.agents/skills/conv/` is how to write a script that is right the
first time: what to write for what you want to hear, the rules that catch people out,
and how to check the result. Agents that read `.agents/skills/` pick it up in this
repository. To have it anywhere else:

```sh
npx skills add https://github.com/constructive-io/conversation-format --skill conv
```

Rendering a script is the `constructive-media` skill, in
[Constructive Media](https://github.com/constructive-io/media-engine)'s repository.

## Extending the format

The core grammar is small; effects, slide markers, on-screen speakers and video
are plugins, and you can add your own — keys, enum values, tracks and
`[directives]`. See [the parser's README](./packages/parser#plugins).

## Development

```sh
pnpm install
pnpm build
pnpm test
UPDATE_FIXTURES=1 pnpm --filter @conversation/spec test   # after a deliberate grammar change
```

## License

MIT

## Credits

**🛠 Built by the [Constructive](https://constructive.io) team — creators of modular Postgres tooling for secure, composable backends. If you like our work, contribute on [GitHub](https://github.com/constructive-io).**

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
