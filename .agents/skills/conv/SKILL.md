---
name: conv
description: The `.conv` format — a plain-text screenplay for multi-voice audio. Use when asked to "write a .conv script", "write a scene", "write a dialogue for voices", "turn this into a .conv", "add music or sound effects to a script", "check a .conv file", "fix the errors in a script", "parse a .conv", or to build a tool that reads the format.
compatibility: Node.js 20+ for the reference parser and the `conv` command
metadata:
  author: constructive-io
  version: "0.3.0"
---

# The `.conv` format

A `.conv` file is a play written for the ear: a cast, a list of sounds, and a
script of dialogue, pauses and cues. It says who speaks, what they say, how,
and what is heard around them. It never says how any of it is produced: voices,
sound generation, mixing and playback belong to whatever renders the file.

The grammar is [SPEC.md](../../../SPEC.md). This page is how to write a script
that is right the first time, and how to check it.

## When to apply

- Writing a script: a conversation, a scene, a narrated deck, a podcast segment.
- Checking a script, or mending the problems a check reports.
- Reading a script in a program: the parser, its JSON, its plugins.
- Explaining what checks a script and what turns it into sound.

## How the pieces fit

| Piece | Where | What it does |
| --- | --- | --- |
| The format | [SPEC.md](../../../SPEC.md) | says what a script may hold |
| `@conversation/spec` | npm, and [`packages/parser`](../../../packages/parser) | reads a script: text in, a scene as JSON out |
| `@conversation/cli` | npm, and [`packages/cli`](../../../packages/cli) | the `conv` command: `conv check` and `conv parse` |
| A renderer | such as [Constructive Media](https://github.com/constructive-io/constructive-media) | turns a script into sound |

Nothing in this repository makes a sound, and nothing in it calls a renderer.
A renderer reads the script itself, and gives the same answers as this parser
because both are held to the files in [`__fixtures__/`](../../../__fixtures__).
So the work goes: write the script, run `conv check` until it says `ok`, then
give the same file to a renderer.

## A script

```conv
ALICE: Did you hear that?
BOB: I did. It came from the attic.
```

That is a whole script. Declare the cast when a character needs more than a
name, and the sounds when anything but speech is heard:

```conv
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

Everything above `---` declares. Everything below it happens, in order.

## What to write

| Write | To get |
| --- | --- |
| `ALICE: { persona: alice, emotion: warm }` under `@characters` | a character, the voice identity that speaks it, and how it sounds by default |
| `RAIN: { file: sounds/rain.wav, loop: true, track: ambience }` under `@sounds` | a sound from a file |
| `CREAK: { prompt: "an old floorboard creaking", duration: 2 }` under `@sounds` | a sound from a description |
| `remote: { compress: yes, reverb: room, gain: -2 }` under `@tracks` | a track of your own |
| `---` | the end of the declarations |
| `ALICE: Did you hear that?` | a line |
| `ALICE[whisper]: ...` | a line in an emotion |
| `ALICE[whisper, seed:207, reverb:hall]: ...` | a line with its own emotion, take and effects |
| `<break 0.4>` in a line | a silence in the middle of it |
| `{firm: together}` in a line | a few words in another emotion |
| `<sfx CREAK>` in a line | a sound that lands in the middle of it |
| `[pause 1.5]` | a silence between lines |
| `[CREAK]` | a sound, played over what follows |
| `[CREAK hold]` | a sound the scene waits for |
| `[CREAK at:+0.5, pan:-0.4]` | a sound half a second from here, to the left |
| `[music BED fade-in:3]` | a sound started on a track |
| `[music vol:0.5 ramp:2]` | a track turned down over two seconds |
| `[music off fade-out:4]` | a track stopped |
| `# a note` on a line of its own | a comment |

The tracks that are always there are `dialogue`, `foreground`, `ambience`,
`music` and `transition`. Effects, on a character, a line, a span or a track,
are `reverb` (`room`, `hall`, `cathedral`, `plate`), `reverb-mix`, `delay`,
`delay-feedback`, `delay-mix` and `compress`.

Music under a conversation, brought in before the first line and taken out
after the last:

```conv
@characters
HOST:  { persona: host }
GUEST: { persona: guest, track: remote }

@sounds
INTRO: { file: music/intro.mp3 }
BED:   { file: music/bed.mp3 }

@tracks
remote: { compress: yes, reverb: room, gain: -2 }
---
[transition INTRO hold]
[music BED fade-in:3]
HOST: Welcome back to the show.
GUEST: Thanks for having me.
[music vol:0.5 ramp:2]
HOST: Let's begin where we left off.
[music off fade-out:4]
```

Sounds and tracks that several scripts share go in a bank, a `.sounds` file
holding only `@sounds`, `@tracks` and further includes. `@include studio` in a
script's header reads `banks/studio.sounds`, and the script's own declaration
of a name wins over the bank's.

## Rules that catch people out

- **Characters and sounds are UPPERCASE, tracks are lowercase.** In brackets
  the case decides: `[RAIN]` is a sound, `[music ...]` is a track.
- **A declaration is one line:** `NAME: { key: value, key: value }`. Quote a
  value that holds a comma.
- **A sound has `file:` or `prompt:`, never both** and never neither.
- **A line has one emotion.** `ALICE[whisper]:` and not `ALICE[whisper, sad]:`.
  Use a `{sad: span}` for a change inside the line.
- **`persona` belongs to the character,** not to a line.
- **A comment is a whole line.** A `#` after dialogue is spoken.
- **Every sound a cue names must be declared** under `@sounds` or in a bank.
- **Nothing is ignored.** An unknown key or a bad value is an error, with the
  valid ones listed.
- **Place sounds from here, not from the start.** `at:+2` and `at:-2` are
  measured from where the cue stands, so an edit earlier in the script does
  not move them. `at:18.5` is from the start; keep it for what must be.
- **After the first line, a track only takes a fader move:** `vol`, with
  `ramp:` and `at:`. Set everything else in `@tracks`.

## Writing for the ear

- One thought to a line. A long speech is several lines by the same character.
- Write what is said, as it is said: numbers and abbreviations as words when
  how they are spoken matters.
- Put a silence where a person would take one: `<break 0.3>` inside a line,
  `[pause 1]` between lines.
- Name an emotion only where it changes something. The character's default
  carries the rest.
- Give a line a `seed:` to keep a take of it you like.
- Say what is heard, not how it is made. No model names, voices' files or
  machine paths: a persona is a name the renderer resolves.

## Check it

```sh
npx @conversation/cli check scripts/*.conv              # every problem in every file; exit 1 if any
npx @conversation/cli parse scripts/attic.conv          # the scene as JSON
npx @conversation/cli parse scripts/attic.conv --compact
```

This needs only Node.js. `npm install -g @conversation/cli` puts the command on
the path, and then it is `conv check scripts/*.conv`. `--banks <dir>` says
where `@include NAME` finds `NAME.sounds`; without it, `banks/` beside the
script and then in the current folder.

Working on the format itself, in a clone of this repository, run the parser as
it stands in the tree:

```sh
pnpm install && pnpm build
node packages/cli/dist/cli.js check __fixtures__/errors/typos.conv
```

Every problem is reported at once, each with its line, what is wrong and how
to mend it. That last command prints:

```text
__fixtures__/errors/typos.conv: 5 problems

  line 9: [music BED fade-ot:3]
    unknown key `fade-ot` on a [music …] play. Did you mean `fade-out`?
      Valid keys: at, duration, fade-in, fade-out, for, hold, level, loop, noloop, pan, seed, start, vol, xfade

  line 10: [GLASS vol:loud]
    `vol:loud` — vol must be a number

  line 11: [GLAS]
    sound `GLAS` isn't declared under @sounds. Did you mean `GLASS`?
      Add it, e.g. `GLAS: { file: sounds/glas.wav }` or `GLAS: { prompt: "…", duration: 3 }`

  line 12: DAN[reverb:haul]: hi
    `reverb:haul` — not one of: room, hall, cathedral, plate. Did you mean `hall`?

  line 13: DAN[happy, sad]: hi
    `[happy, sad]` names 2 emotions (happy, sad) — a line has one. Pick one, e.g. `[happy]`
```

Mend every one and check again. A script is not finished until the check
says `ok`.

## Hear it

The format says nothing about how a script becomes sound; a renderer does that.
[Constructive Media](https://github.com/constructive-io/constructive-media) is
an implementation: it reads a script with a parser held to this repository's
conformance files, says every line through a speech model you point it at,
listens back to each one, and mixes the scene.

```sh
media conv scene.conv                      # the same check, in the renderer
media voice alice a-voice-your-speech-server-knows --new
media say scene.conv out/scene.flac --stems  # the scene as sound
```

`media` is that engine's command, not this repository's: `conv` never makes a
sound. Setting it up is the `constructive-media` skill in that repository. Two things
it asks of a script today: every persona needs a voice, and a sound needs a
`file:`, since it does not yet make a sound from a `prompt:`.

## See it

A script can also say what is on screen while it is heard. Three marks do it.
They take no time; a renderer records the moment each one falls.

| Mark | Does |
| --- | --- |
| `[slide intro]`, `[slide intro step:2]` | shows the slide `intro`, and its second build, from here |
| `[speakers lower-third captions]` | what a player draws of whoever is speaking: any of `faces`, `lower-third`, `waveform`, `captions`; `all`; `off` |
| `[video CLIP]` | plays a clip that takes the screen. `CLIP` is declared with the sounds, with a `file:` |

```
@characters
NARRATOR: { persona: narrator, name: Ada Marsh, title: Keeper of the light }
---
[speakers lower-third captions]
[slide title]
NARRATOR: Three things are written down every night.
[slide what step:1]
NARRATOR: The first is when the lamp was lit.
```

A mark goes on the line before the words it belongs with. `name:` and `title:`
on a character are what a lower-third shows.

Constructive Media films it: after `media say`, `media film out/scene.flac
out/scene.mp4 --page FOLDER` records a page of HTML whose elements carry the
same names (`data-slide="what"`, `data-step="1"`) following the sound. Starting
points with a page, a script and a `package.json` are in
[media-boilerplates](https://github.com/constructive-io/media-boilerplates): a
deck, a walkthrough, an animation, and a document that is read aloud.

## Before you call a script done

- **Run the check.** `conv check` says `ok` and exits 0. Do not judge a script
  by eye.
- **Know what the check cannot see.** It reads text. It does not open a sound's
  `file:`, and it does not know whether a persona has a voice. Both are found
  when the script is rendered, so say so if you have not rendered it.
- **Keep the script portable.** No model names, no voices' files, no paths that
  exist on one machine only.
- **Asked for sound, not a script?** Render it as above, and report what the
  renderer said, with every line it marked for a listen.

## Read it in a program

```ts
import { parse } from '@conversation/spec';

const scene = parse(text, { source: 'attic.conv' });   // throws ConvError listing every problem
for (const item of scene.items) {
  if (item.type === 'line') console.log(item.speaker, item.segments);
}
```

The scene's shape is in [SPEC.md §13](../../../SPEC.md#13-the-parsed-scene).
New keys, values, tracks and `[directives]` are added by a plugin, described in
[the parser's README](../../../packages/parser/README.md#plugins); slides,
on-screen speakers and video are plugins the parser ships with. Another
parser is held to the same answers by the files in
[`__fixtures__/`](../../../__fixtures__).

## Related skills

| Skill | Where | For |
| --- | --- | --- |
| `constructive-media` | [constructive-media](https://github.com/constructive-io/constructive-media) | Rendering a script: voices, the speech server, `media say`, `media film` |
| `media-workspace` | [media-boilerplates](https://github.com/constructive-io/media-boilerplates) | Starting a project of scripts and pages, and building it |
| `narrated-video` | the same | A script and a page to a video: decks, walkthroughs, animations |
| `narrated-document` | the same | A document that prints as a PDF and is filmed being read |
| `voice-library` | [voice-boilerplates](https://github.com/constructive-io/voice-boilerplates) | A repository of voices, sounds and faces a renderer can add |
| `media-engine-plugins` | [media-engine-plugins](https://github.com/constructive-io/media-engine-plugins) | Adapters for that engine under copyleft licenses |
