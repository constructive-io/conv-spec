/**
 * "Did you mean" — closest option by Ratcliff/Obershelp similarity, the same
 * measure as Python's difflib, so suggestions match across implementations.
 */

function matching(a: string, b: string): number {
  if (!a.length || !b.length) return 0;
  let best = 0;
  let ai = 0;
  let bi = 0;
  let prev = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    const cur = new Array<number>(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        cur[j] = prev[j - 1] + 1;
        if (cur[j] > best) {
          best = cur[j];
          ai = i - best;
          bi = j - best;
        }
      }
    }
    prev = cur;
  }
  if (!best) return 0;
  return (
    best +
    matching(a.slice(0, ai), b.slice(0, bi)) +
    matching(a.slice(ai + best), b.slice(bi + best))
  );
}

export function similarity(a: string, b: string): number {
  const total = a.length + b.length;
  return total ? (2 * matching(a, b)) / total : 1;
}

export function closest(word: string, options: Iterable<string>, cutoff = 0.6): string | null {
  let best: string | null = null;
  let score = cutoff;
  for (const o of options) {
    const s = similarity(word, o);
    if (s >= score && (best === null || s > score)) {
      best = o;
      score = s;
    }
  }
  return best;
}

export function didYouMean(
  word: string,
  options: Iterable<string>,
  show: (s: string) => string = (s) => s
): string {
  const m = closest(word, options);
  return m ? `. Did you mean \`${show(m)}\`?` : '';
}
