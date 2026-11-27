## Conversation and Media Engine ecosystem

[Conversation Format](https://github.com/constructive-io/conversation-format) is a plain-text screenplay format for multi-voice audio. A `.conv` script describes the cast, dialogue, pauses, and sound cues; it leaves voices, mixing, and playback to the renderer.

- [`@conversation/spec` on npm](https://www.npmjs.com/package/@conversation/spec) · [source](https://github.com/constructive-io/conversation-format/tree/main/packages/parser): the TypeScript reference parser turns a script into a scene.
- [`@conversation/cli` on npm](https://www.npmjs.com/package/@conversation/cli) · [source](https://github.com/constructive-io/conversation-format/tree/main/packages/cli): run `conv check` to validate scripts or `conv parse` to emit JSON.
- [`SPEC.md`](https://github.com/constructive-io/conversation-format/blob/main/SPEC.md): the grammar, backed by [conformance fixtures](https://github.com/constructive-io/conversation-format/tree/main/__fixtures__).
- [`conv` agent skill](https://github.com/constructive-io/conversation-format/blob/main/.agents/skills/conv/SKILL.md): write and check scripts with a coding agent. Install it with `npx skills add constructive-io/conversation-format --skill conv`.

### Render .conv scripts with Constructive Media

[Constructive Media (Media Engine)](https://github.com/constructive-io/media-engine) implements Conversation Format. It turns scripts into multi-voice recordings with sound cues and a mix, then can film a deck, walkthrough, or other page in sync with the recording.

- [`constructive-media` Python package](https://github.com/constructive-io/media-engine/tree/main/python/constructive_media): the engine for media processing, speech, and rendering.
- [`media` CLI](https://github.com/constructive-io/media-engine#usage): use `media say` to render a recording and `media film` to make a video.
- [`media-core`](https://github.com/constructive-io/media-engine/tree/main/packages/media-core): personas, voices, assets, takes, and provenance.
- [`media-video`](https://github.com/constructive-io/media-engine/tree/main/packages/media-video): shots, frames, transcripts, passages, timelines, and editing decisions.
- [`media-audio`](https://github.com/constructive-io/media-engine/tree/main/packages/media-audio): speech synthesis, emotions, renders, and review.
- [Plugins](https://github.com/constructive-io/media-engine-plugins): optional adapters for tools under copyleft licenses.
- [Boilerplates](https://github.com/constructive-io/media-engine-boilerplates): starter projects for narrated decks, walkthroughs, animations, and documents.
- [Library index](https://github.com/constructive-io/media-engine-libraries): find libraries of voices, sounds, and faces.
- [CC0 foley library](https://github.com/constructive-io/media-engine-library-foley): sound effects, ambience loops, and music beds.

## Credits

**🛠 Built by the [Constructive](https://constructive.io) team — creators of modular Postgres tooling for secure, composable backends. If you like our work, contribute on [GitHub](https://github.com/constructive-io).**

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
