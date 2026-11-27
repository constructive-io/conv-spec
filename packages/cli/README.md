# @conversation/cli

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/conversation-format/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/conversation-format/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
  <a href="https://github.com/constructive-io/conversation-format/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
  <a href="https://www.npmjs.com/package/@conversation/cli"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/conversation-format?filename=packages%2Fcli%2Fpackage.json"/></a>
</p>

Check [`.conv`](../../SPEC.md) scripts and print them as JSON.

```sh
npm install -g @conversation/cli

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
import { fileResolver } from '@conversation/cli';
import { parse } from '@conversation/spec';

parse(text, { source: path, include: fileResolver({ banks: ['banks'], roots: [process.cwd()] }) });
```
