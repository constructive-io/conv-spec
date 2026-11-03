# @constructive-io/conv-parser

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/conv-spec/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/conv-spec/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
  <a href="https://github.com/constructive-io/conv-spec/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
  <a href="https://www.npmjs.com/package/@constructive-io/conv-parser"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/conv-spec?filename=packages%2Fparser%2Fpackage.json"/></a>
</p>

The reference parser for [`.conv`](../../SPEC.md): text in, a JSON-shaped scene
out. No dependencies, no filesystem, runs anywhere.

## Install

```sh
npm install @constructive-io/conv-parser
```

## Parse

```ts
import { ConvError, parse } from '@constructive-io/conv-parser';

try {
  const scene = parse(text, { source: 'attic.conv' });
  scene.characters; // { ALICE: { persona: 'alice' }, … }
  scene.sounds;     // { RAIN: { file: 'sounds/rain.wav', loop: true, track: 'ambience' }, … }
  scene.items;      // lines, pauses, cues, track directives and marks, in order
} catch (e) {
  if (e instanceof ConvError) console.error(e.message); // every problem, with fixes
}
```

| Option | |
|---|---|
| `source` | a name for messages; also the `from` passed to the include resolver |
| `strict` | `true` (default) throws `ConvError`; `false` returns problems in `scene.problems` |
| `plugins` | defaults to `defaultPlugins` |
| `include` | an `IncludeResolver` for `@include` |

The scene's shape is described in [SPEC.md §13](../../SPEC.md#13-the-parsed-scene)
and typed in `Scene`, `Item` and `Segment`.

## Includes

The parser never reads files. `@include` goes through a resolver you pass in:

```ts
import { memoryResolver, parse } from '@constructive-io/conv-parser';

parse(text, { include: memoryResolver({ studio: studioBankText }) });
```

A resolver is one function — `resolve(ref, from)` returns `{ id, text }` or
`{ tried }` — plus an optional `list()` for suggestions. The CLI package has a
filesystem one.

## Plugins

Everything beyond the core grammar is a plugin. The defaults:

| Plugin | Adds |
|---|---|
| `effects()` | `reverb`, `reverb-mix`, `delay`, `delay-feedback`, `delay-mix`, `compress` |
| `slides()` | `[slide ID step:N]` |
| `speakers()` | `[speakers …]`; `name:` and `title:` on characters |
| `video()` | the `video` track and `[video CLIP]` |

Pass your own alongside them:

```ts
import { ConvPlugin, defaultPlugins, effects, num, parse, slides, speakers, str, video } from '@constructive-io/conv-parser';

const chapters: ConvPlugin = {
  name: 'chapters',
  // [chapter The Attic] -> { type: 'mark', kind: 'chapter', data: { title: 'The Attic' } }
  directives: {
    chapter(args, ctx) {
      if (!args) return ctx.error('`[chapter]` needs a title');
      return { title: args };
    },
  },
  // DAN[rate:0.9]: …  — validated, coerced, in line.overrides
  keys: { line: { rate: num(0.5, 2) }, character: { engine: str() } },
};

parse(text, { plugins: [...defaultPlugins, chapters] });

// configure a default: a renderer with its own reverb presets
parse(text, { plugins: [effects({ reverbPresets: ['room', 'hall', 'spring'] }), slides(), speakers(), video()] });
```

A `ConvPlugin` can contribute:

| Field | |
|---|---|
| `keys` | keys per context: `character`, `line`, `span`, `sound`, `track`, `play`, `off`, `set` |
| `enums` | values for a named enum; plugins naming the same enum add to it |
| `tracks` | built-in tracks |
| `reserved` | words that can't name a track (directive names are reserved automatically) |
| `directives` | `[name …]` handlers that return a mark's data |
| `trackRules` | checks for directives on a named track |
| `finalize` | a pass over the finished scene that can report problems |

Key types: `str()`, `int()`, `num(min, max)`, `bool()`, `time()`,
`oneOf(...values)`, `named(enumName)`, `track()`, `tracks()`.

## Credits

**🛠 Built by the [Constructive](https://constructive.io) team — creators of modular Postgres tooling for secure, composable backends. If you like our work, contribute on [GitHub](https://github.com/constructive-io).**

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
