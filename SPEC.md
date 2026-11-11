# The `.conv` format

A `.conv` file is a play written for the ear: a cast list, a list of sounds, and
a script of dialogue, pauses and cues. It says **who** speaks, **what** they say,
**how** (emotion, effects), and **what is heard around them** (music, ambience,
sound effects) — and nothing about how any of it is produced. Voices, sound
generation, mixing and playback belong to whatever renders the file.

This document is the grammar. The reference parser is
[`@constructive-io/conv-parser`](./packages/parser); the conformance fixtures in
[`__fixtures__/`](./__fixtures__) pin exactly what a parser must produce.

```
# attic.conv
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

## 1. Lines

The file is UTF-8 text, read one line at a time; each line is trimmed.

- A blank line is ignored.
- A line starting with `#` is a comment. Comments are whole lines only — `#` in
  the middle of dialogue is part of what is said.

## 2. Structure

A file has a **header** and a **body**, separated by a line holding only `---`.
The header declares; the body happens in order.

| Header line | Starts |
|---|---|
| `@characters` (or `@voices`) | character declarations |
| `@sounds` | sound declarations |
| `@tracks` | track declarations |
| `@include REF` | pulls `@sounds` and `@tracks` from a bank (§8) |

Blocks may come in any order and repeat. Any other line starting with `@` is an
error. The `---` is optional for a script that only has dialogue: the first
spoken line also starts the body.

## 3. Names

| Kind | Form | Example |
|---|---|---|
| character | `[A-Z][A-Z0-9_]*` | `ALICE`, `MARY_JANE` |
| sound | `[A-Z][A-Z0-9_-]*` | `RAIN`, `BED-2` |
| track | `[a-z][a-z0-9_-]*` | `music`, `remote` |

Case carries meaning in the body: an UPPERCASE head in brackets is a sound, a
lowercase head is a directive (a track, or a plugin's directive).

## 4. Declarations

Every declaration is `NAME: { key: value, … }` on one line.

- Pairs are separated by commas. A value may be quoted (`"…"` or `'…'`) to hold
  commas; the quotes are not part of the value.
- Keys are case-insensitive, and `-` and `_` are the same: `fade-in` is `fade_in`.
- Every key needs a value. Unknown keys are errors.

### Characters

```
ALICE: { persona: alice, emotion: warm, track: study, reverb: room }
```

| Key | Value | |
|---|---|---|
| `persona` | text | the voice identity a renderer resolves; `voice:` and `speaker:` are aliases |
| `emotion` | text | default emotion for every line |
| `track` | track | where this character's lines play (default `dialogue`) |
| `seed` | integer | default take |
| `gain` | dB, −60…24 | |

Plus effect keys (§10) and any keys plugins add (`name:`, `title:` from §11.2).

### Sounds

```
GLASS: { prompt: "a wine glass shattering on tile", duration: 2 }
BED:   { file: music/bed.mp3 }
```

A sound needs exactly one source: `file:` (a path the renderer resolves) or
`prompt:` (a description a generator realises).

| Key | Value | |
|---|---|---|
| `file` / `prompt` | text | the source |
| `duration` | seconds, 0.05…3600 | |
| `seed` | integer | |
| `loop` | boolean | |
| `level` | dB RMS, −80…0 | normalisation target |
| `start` | time | offset into the source |
| `track` (or `layer`) | track | where a bare `[NAME]` cue plays (default `foreground`) |

### Tracks

```
remote: { compress: yes, reverb: room, gain: -2 }
crowd:  { kind: bed, level: -28, pan: 0.3, duck: -6, duck-under: speech }
```

| Key | Value | |
|---|---|---|
| `kind` | `bed` \| `oneshot` | a bed runs until stopped; a one-shot runs its length |
| `level` | dB, −80…0 | |
| `vol` | 0…4 | linear fader |
| `gain` | dB, −60…24 | |
| `pan` | −1…1 | |
| `duck` | dB, −60…0 | how far the track dips under its side-chain |
| `duck-under` | tracks | `a,b` or `a+b`; `speech` = every track dialogue reaches |
| `fade-in`, `fade-out`, `xfade`, `tail` | seconds | |
| `loop`, `exclusive` | boolean | |

Plus effect keys (§10). `pause`, `off`, `track` and every directive name are
reserved and cannot name a track.

## 5. The body

| Form | Meaning |
|---|---|
| `NAME: text` | a line of dialogue |
| `NAME[overrides]: text` | …with per-line overrides |
| `[pause N]` | N seconds of silence |
| `[SOUND …]` | a cue: play SOUND on its track (§6) |
| `[track …]` | a track directive (§7) |
| `[directive …]` | a plugin directive (§11) |

### Dialogue overrides

`NAME[excited, seed:303, reverb:hall]: …` — a comma list. A bareword is the
line's emotion (one per line); everything else is `key:value`.

| Key | |
|---|---|
| `emotion` | or a bareword: `[whisper]` |
| `seed` | integer |
| `track` | route this line to another track |
| `gain` | dB |

Plus effect keys. `persona` can't change per line.

### Inline markers

Inside the text of a line:

| Form | Meaning |
|---|---|
| `<break N>` or `<N>` | N seconds of silence mid-line |
| `{emotion: text}` | a span in another emotion |
| `{whisper, reverb:hall: text}` | a span with overrides (same keys as a line, minus `track`) |
| `<sfx SOUND …>` | a cue that lands mid-line |

A line becomes a list of **segments**: text, breaks and sfx. Text outside spans
has no overrides of its own. A fragment of bare punctuation after a span joins
the text before it (`{firm: talk}.` speaks "talk." once). A line with no markers
is exactly one text segment.

## 6. Cues and plays

`[GLASS]`, `[GLASS vol:0.9, pan:0.2 hold]` — tokens are separated by commas or
spaces. A bareword is a flag (`hold`, `loop`, `noloop`).

| Key | Value | |
|---|---|---|
| `at` | seconds | omitted: here in the flow. `at:+2` / `at:-2`: relative to here. `at:18.5`: from the start |
| `hold` | flag | the scene waits for the sound; otherwise it plays over what follows |
| `vol` | 0…4 | linear; `gain` is an alias here |
| `pan` | −1…1 | |
| `fade-in`, `fade-out`, `xfade` | seconds | |
| `duration` | seconds | |
| `start` | time | offset into the source (`from:` is an alias) |
| `for` | time | play at most this long (`length:` is an alias) |
| `level` | dB | |
| `seed` | integer | |
| `loop`, `noloop` | flag | |

Positions are relative by default so that editing a script never silently
moves every later cue. A **time** is seconds (`15`, `2.5`) or `m:ss` (`0:15`,
`1:02.5`).

## 7. Tracks

A sound says **what** plays; a track says **where**. Built-in tracks:

| Track | Usually |
|---|---|
| `dialogue` | speech |
| `foreground` | one-shots; where a bare cue plays |
| `ambience` | looping beds |
| `music` | an exclusive bed: a new song replaces the last |
| `transition` | stings between scenes |

Plugins may add built-in tracks (§11.3); `@tracks` declares more, and declaring
a built-in overrides its settings.

| Directive | Meaning |
|---|---|
| `[music BED fade-in:3]` | play a sound on the track (play keys, §6) |
| `[music off]` | stop everything on it (`none`, `stop` also work) |
| `[music off BED fade-out:4]` | stop one sound |
| `[music vol:0.5 ramp:2]` | set the track |
| `[music: path/to/file.mp3 vol:0.2]` | play a file directly on `music` |

Before the first line of the body, a set may use any track key. After it, only
`vol` (with `ramp:` seconds, and `at:`) can change — a fader move.

How a renderer realises tracks — levels, ducking, fades, loop crossfades — is up
to it. The format guarantees only that every cut, start and fader move is
explicit and ordered.

## 8. Banks (`@include`)

A **bank** is a `.sounds` file holding only `@sounds`, `@tracks` and further
`@include`s, shared between scripts.

```
@include studio          # a bank by name
@include ./room.sounds   # a path
```

- `@include` belongs in the header. How a reference becomes text is the host's
  choice (a directory of banks, paths relative to the including file, a fetch).
- **The script wins**: its own declaration replaces an included one.
- Two banks defining one name is an error, unless the script declares the name
  itself.
- A missing bank, a cycle, or a bank with characters or dialogue is an error.

## 9. Values

| Kind | Accepts | Becomes |
|---|---|---|
| text | anything non-empty | string |
| integer | `-?[0-9]+` | number |
| number | a decimal in range | number |
| boolean | `true yes on` / `false no off` | boolean |
| time | seconds or `m:ss` | number of seconds |
| enum | one of a set (case-insensitive) | lowercase string |
| track | a known track | string |
| tracks | `a,b` or `a+b` | list of strings |

## 10. Effects

On characters, lines, spans and tracks:

| Key | Value |
|---|---|
| `reverb` | a preset: `room`, `hall`, `cathedral`, `plate` (a renderer may offer more) |
| `reverb-mix` | 0…1 |
| `delay` | seconds, 0.01…5 |
| `delay-feedback` | 0…0.95 |
| `delay-mix` | 0…1 |
| `compress` | boolean |

## 11. Extensions

The core grammar is §1–§9. Everything else — including effects — is a
**plugin**, and the reference parser ships these by default. A plugin may:

- add keys to any context (character, line, span, sound, track, play, off, set);
- add values to a named enum (e.g. more reverb presets);
- add built-in tracks, with rules for directives on them;
- add body directives `[name …]`, which produce **marks**;
- check the finished scene.

A **mark** is silent and timeless: it occupies no time, and a renderer records
the moment it falls (for a deck, a video edit, a player's UI).

### 11.1 Slides

`[slide ID]`, `[slide ID step:N]` — show slide ID, and its Nth build, from here.
The id is lowercase. Mark: `{ "id": "problem", "step": 1 }`.

### 11.2 Speakers

`[speakers faces lower-third waveform captions]`, `[speakers all]`,
`[speakers off]` — which widgets a player shows for whoever is speaking.
`lower-third` introduces a person on their first line; `lower-third:always`
shows it on every line. `faces` shows the face with its mouth left alone
(`faces:still` means the same); `faces:talking` moves the mouth with the voice.
Characters gain `name:` and `title:` for it.
Mark: `{ "show": ["faces", "lower-third"] }`.

### 11.3 Video

`video` is a built-in track. `[video CLIP]` plays a clip that takes the screen:
it always holds, can't be placed with `at:`, can't be stopped or set, accepts
only `start:`, `for:` and `vol:`, and its sound must be a `file:`.

## 12. Errors

**Report, don't drop.** A parser reports every problem in a script at once, in
order, each with its line number, the line, what is wrong and how to fix it — a
suggestion for a typo, the valid keys or values, the corrected form of an old
syntax. Nothing is silently ignored or defaulted: an unknown key, a bad value
and an undeclared sound are all errors.

**Defaults, not demands.** Anything with a sensible default needs no input.

## 13. The parsed scene

A parser produces a JSON-shaped scene. Keys are canonical (snake_case, aliases
resolved) and values coerced (§9).

```jsonc
{
  "characters": { "ALICE": { "persona": "alice" } },
  "sounds":     { "RAIN": { "file": "sounds/rain.wav", "loop": true, "track": "ambience" } },
  "tracks":     { "remote": { "compress": true } },     // declared only
  "items": [
    { "type": "line", "line": 12, "speaker": "BOB", "text": "…",
      "overrides": { "emotion": "excited" },
      "segments": [ { "type": "text", "text": "I did!", "overrides": {} },
                    { "type": "break", "seconds": 0.4 },
                    { "type": "sfx", "sound": "CREAK", "overrides": {} } ] },
    { "type": "pause", "line": 14, "seconds": 1.5 },
    { "type": "cue",   "line": 10, "sound": "RAIN", "track": "ambience", "overrides": {} },
    { "type": "track", "line": 15, "track": "music", "action": "play", "sound": "BED",
      "overrides": { "at": { "mode": "offset", "seconds": -2 }, "fade_in": 3 } },
    { "type": "mark",  "line": 16, "kind": "slide", "data": { "id": "intro", "step": 0 } }
  ],
  "problems": [],
  "index": { "character": {}, "sound": {}, "track": {}, "speaker": {}, "file": {} }
}
```

`index` records where each name was declared (or first spoken), with the
`include` it came from, so a renderer can point its own errors at a line.

## Conformance

`__fixtures__/scenes/*.conv` must parse to the matching `.json`;
`__fixtures__/errors/*.conv` must report the matching `.errors.json`. Banks
for both live in `__fixtures__/banks/`.
