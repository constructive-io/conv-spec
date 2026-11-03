# @constructive-io/conv-cli

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/conv-spec/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/conv-spec/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
  <a href="https://github.com/constructive-io/conv-spec/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
  <a href="https://www.npmjs.com/package/@constructive-io/conv-cli"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/conv-spec?filename=packages%2Fcli%2Fpackage.json"/></a>
</p>

Check [`.conv`](../../SPEC.md) scripts and print them as JSON.

```sh
npm install -g @constructive-io/conv-cli

conv check scripts/*.conv            # every problem in every file; exit 1 if any
conv parse scripts/attic.conv        # the parsed scene as JSON
conv parse scripts/attic.conv --compact
```

`@include NAME` reads `NAME.sounds` from `--banks <dir>` (repeatable), or by
default from `banks/` next to the script, then `banks/` in the current
directory. An include with a `/` or `.` is a path, relative to the including
file and then the current directory.

The same pieces are importable:

```ts
import { fileResolver } from '@constructive-io/conv-cli';
import { parse } from '@constructive-io/conv-parser';

parse(text, { source: path, include: fileResolver({ banks: ['banks'], roots: [process.cwd()] }) });
```

## Credits

**🛠 Built by the [Constructive](https://constructive.io) team — creators of modular Postgres tooling for secure, composable backends. If you like our work, contribute on [GitHub](https://github.com/constructive-io).**

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
