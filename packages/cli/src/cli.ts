#!/usr/bin/env node
import { main } from './run';

process.exitCode = main(process.argv.slice(2), {
  out: (s) => process.stdout.write(s + '\n'),
  err: (s) => process.stderr.write(s + '\n'),
  cwd: process.cwd(),
});
