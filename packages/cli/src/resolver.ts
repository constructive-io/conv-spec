import type { IncludeResolver } from '@constructive-io/conv-parser';
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'fs';
import { homedir } from 'os';
import { dirname, isAbsolute, join, resolve } from 'path';

export interface FileResolverOptions {
  /** directories of `NAME.sounds` banks, for `@include NAME` (searched in order) */
  banks?: string[];
  /** where a relative include path is tried after the including file's directory */
  roots?: string[];
}

const isFile = (p: string) => existsSync(p) && statSync(p).isFile();

/**
 * `@include podcast` reads `<bank dir>/podcast.sounds`. Anything with a `/` or a
 * `.` is a path: absolute, `~/…`, or relative to the including file, then to each root.
 */
export function fileResolver(options: FileResolverOptions = {}): IncludeResolver {
  const banks = (options.banks ?? []).map((d) => resolve(d));
  const roots = (options.roots ?? []).map((d) => resolve(d));
  return {
    resolve(ref, from) {
      const tried: string[] = [];
      if (!ref.includes('/') && !ref.includes('.')) {
        for (const d of banks) tried.push(join(d, `${ref}.sounds`));
      } else {
        const p = ref.startsWith('~/') ? join(homedir(), ref.slice(2)) : ref;
        if (isAbsolute(p)) tried.push(p);
        else {
          if (from) tried.push(join(dirname(from), p));
          for (const r of roots) tried.push(join(r, p));
        }
      }
      for (const p of tried) {
        if (isFile(p)) return { id: realpathSync(p), text: readFileSync(p, 'utf8') };
      }
      return { tried };
    },
    list() {
      const names = new Set<string>();
      for (const d of banks) {
        if (!existsSync(d)) continue;
        for (const f of readdirSync(d)) if (f.endsWith('.sounds')) names.add(f.slice(0, -7));
      }
      return [...names].sort();
    },
  };
}
