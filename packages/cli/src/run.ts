import { ConvError, formatProblems, parse, Scene } from '@constructive-io/conv-parser';
import { existsSync, readFileSync, realpathSync } from 'fs';
import { dirname, join, resolve } from 'path';

import { fileResolver } from './resolver';

const USAGE = `conv — check .conv scripts and print them as JSON

Usage:
  conv check <file.conv>...    report every problem; exit 1 if there are any
  conv parse <file.conv>       print the parsed scene as JSON

Options:
  --banks <dir>    where \`@include NAME\` finds NAME.sounds (repeatable;
                   default: ./banks next to the script, then in the cwd)
  --compact        one-line JSON
  -h, --help`;

export interface CheckResult {
  file: string;
  scene?: Scene;
  error?: string;
}

export interface Io {
  out(s: string): void;
  err(s: string): void;
  cwd: string;
}

export function checkFile(file: string, banks: string[], cwd: string): CheckResult {
  const path = resolve(cwd, file);
  if (!existsSync(path)) return { file, error: `${file}: no such file` };
  const source = realpathSync(path);
  const bankDirs = banks.length ? banks.map((b) => resolve(cwd, b)) : [join(dirname(source), 'banks'), join(cwd, 'banks')];
  try {
    const scene = parse(readFileSync(source, 'utf8'), {
      source,
      include: fileResolver({ banks: bankDirs, roots: [cwd] }),
    });
    return { file, scene };
  } catch (e) {
    if (e instanceof ConvError) return { file, error: formatProblems(e.problems, file) };
    throw e;
  }
}

export function main(argv: string[], io: Io): number {
  const banks: string[] = [];
  const files: string[] = [];
  let compact = false;
  let command: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') {
      io.out(USAGE);
      return 0;
    }
    if (a === '--banks') banks.push(argv[++i]);
    else if (a === '--compact') compact = true;
    else if (!command) command = a;
    else files.push(a);
  }
  if ((command !== 'check' && command !== 'parse') || !files.length) {
    io.err(USAGE);
    return 2;
  }
  if (command === 'parse') {
    if (files.length > 1) {
      io.err('conv parse takes one file');
      return 2;
    }
    const r = checkFile(files[0], banks, io.cwd);
    if (r.error) {
      io.err(r.error);
      return 1;
    }
    io.out(JSON.stringify(r.scene, null, compact ? 0 : 2));
    return 0;
  }
  let failed = 0;
  for (const f of files) {
    const r = checkFile(f, banks, io.cwd);
    if (r.error) {
      failed++;
      io.err(r.error + '\n');
    } else {
      io.out(`ok  ${f}`);
    }
  }
  if (files.length > 1) io.out(`${files.length - failed} ok, ${failed} with problems`);
  return failed ? 1 : 0;
}
