# AGENTS.md — Conversation Format

The `.conv` format: its grammar, conformance fixtures, and the reference parser.

| Path | |
|---|---|
| `SPEC.md` | the grammar — the source of truth |
| `__fixtures__/scenes/*.conv` + `.json` | must parse to exactly the JSON |
| `__fixtures__/errors/*.conv` + `.errors.json` | must report exactly these problems |
| `__fixtures__/banks/*.sounds` | banks the fixtures include |
| `packages/parser` | `@conversation/spec` — pure TS, no dependencies, no fs |
| `packages/cli` | `@conversation/cli` — `conv check` / `conv parse`, file resolver |
| `.agents/skills/conv/SKILL.md` | the skill: how to write a script and check it |

[Constructive Media](https://github.com/constructive-io/media-engine) implements the
format: it renders scripts, and its parser is held to the fixtures here. A grammar change
is not finished until that parser agrees, so say so when you make one.

## Rules

- A grammar change touches `SPEC.md`, a fixture, and the parser together.
  Regenerate expectations with `UPDATE_FIXTURES=1 pnpm --filter @conversation/spec test`
  and read the diff before committing it.
- The parser stays pure: no filesystem, network or runtime dependencies. I/O goes
  through adapters (`IncludeResolver`).
- New vocabulary (keys, enum values, tracks, directives) goes in a plugin unless
  it is truly core grammar. The defaults live in `packages/parser/src/plugins`.
- Errors are the product: every problem names its line, says what is wrong and
  how to fix it, and all problems are reported at once. Never drop input silently.
- The skill changes with the grammar and with the command: every script it shows must
  parse, every command, option and package it names must exist, and the output it shows
  must be what the command prints. A test in `packages/cli` holds it to all of that.
- Fixtures are text only: no audio, video or image files. Paths inside them are
  placeholders.

## Commands

```sh
pnpm install && pnpm build && pnpm test && pnpm lint
```
