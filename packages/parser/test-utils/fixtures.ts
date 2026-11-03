import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

import { IncludeResolver, memoryResolver } from '../src';

export const FIXTURES = join(__dirname, '../../../__fixtures__');

export function banks(): IncludeResolver {
  const dir = join(FIXTURES, 'banks');
  const all: Record<string, string> = {};
  for (const f of readdirSync(dir)) {
    if (f.endsWith('.sounds')) all[f.slice(0, -7)] = readFileSync(join(dir, f), 'utf8');
  }
  return memoryResolver(all);
}

export function list(sub: string): string[] {
  return readdirSync(join(FIXTURES, sub))
    .filter((f) => f.endsWith('.conv'))
    .sort();
}
