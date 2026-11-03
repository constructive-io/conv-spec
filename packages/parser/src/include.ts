/**
 * `@include` is resolved through an adapter, so the parser never touches a
 * filesystem: a CLI reads files, a browser fetches ahead of time, a test keeps
 * banks in memory.
 */

export type IncludeResult =
  /** `id` identifies the bank (for cycle detection and as the `from` of its own includes) */
  | { id: string; text: string }
  /** not found: where it looked, for the error message */
  | { tried: string[] };

export interface IncludeResolver {
  /** `from` is the id/source of the including file, when known */
  resolve(ref: string, from: string | undefined): IncludeResult;
  /** bank names, for suggestions when a ref isn't found */
  list?(): string[];
}

/** Banks held in memory, by name: `@include podcast` reads `banks.podcast`. */
export function memoryResolver(banks: Record<string, string>): IncludeResolver {
  return {
    resolve(ref) {
      const name = ref.replace(/\.sounds$/, '');
      return name in banks ? { id: name, text: banks[name] } : { tried: [name] };
    },
    list: () => Object.keys(banks).sort(),
  };
}
