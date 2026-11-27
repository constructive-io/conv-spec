## 📚 Agent skills

* [Conversation Format skills](https://github.com/constructive-io/conversation-format/tree/main/.agents/skills): teach Claude Code or another coding agent to write and check `.conv` scripts.

```bash
npx skills add constructive-io/conversation-format
```

## Conversation Format ecosystem

Write plain-text scripts for multi-voice audio with dialogue, pauses, and sound cues.

### 📝 Spec

* [Conversation Format spec](https://github.com/constructive-io/conversation-format/blob/main/SPEC.md): the grammar, backed by [conformance fixtures](https://github.com/constructive-io/conversation-format/tree/main/__fixtures__).

### 📦 Key packages

* [@conversation/spec](https://www.npmjs.com/package/@conversation/spec): the TypeScript reference parser.
* [@conversation/cli](https://www.npmjs.com/package/@conversation/cli): use `conv check` to validate scripts and `conv parse` to emit JSON.

### 🎬 Render .conv scripts with Constructive Media

* [Media Engine](https://github.com/constructive-io/media-engine): turn scripts into multi-voice audio with `media say`, then make videos with `media film`.
* [Starters](https://github.com/constructive-io/media-engine-boilerplates): scaffold narrated decks, walkthroughs, animations, and documents.
* [Plugins](https://github.com/constructive-io/media-engine-plugins): optional adapters for tools under copyleft licenses.
* [Libraries](https://github.com/constructive-io/media-engine-libraries): find voices, sounds, and faces, including the [CC0 foley library](https://github.com/constructive-io/media-engine-library-foley).
* [Media Engine skills](https://github.com/constructive-io/media-engine/tree/main/.agents/skills): learn to render scripts, stage video, and work with libraries.

## Credits

**🛠 Built by the [Constructive](https://constructive.io) team — creators of modular Postgres tooling for secure, composable backends. If you like our work, contribute on [GitHub](https://github.com/constructive-io).**

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
