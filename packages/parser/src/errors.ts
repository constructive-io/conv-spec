import { Problem } from './types';

function order(problems: Problem[]): Problem[] {
  return [...problems].sort((a, b) => {
    if (a.line === null) return b.line === null ? 0 : 1;
    if (b.line === null) return -1;
    return a.line - b.line;
  });
}

/** Every problem, in script order: line number, the line, what is wrong and how to fix it. */
export function formatProblems(problems: Problem[], source?: string): string {
  const n = problems.length;
  const out = [`${source || '.conv script'}: ${n} problem${n === 1 ? '' : 's'}`];
  for (const p of order(problems)) {
    out.push('');
    out.push(p.line ? `  line ${p.line}: ${p.text}` : '  (script)');
    p.message.split('\n').forEach((part, i) => out.push((i === 0 ? '    ' : '      ') + part));
  }
  return out.join('\n');
}

/** Thrown by a strict parse: carries every problem in the script, not just the first. */
export class ConvError extends Error {
  readonly problems: Problem[];
  readonly source?: string;

  constructor(problems: Problem[], source?: string) {
    super(formatProblems(problems, source));
    this.name = 'ConvError';
    this.problems = order(problems);
    this.source = source;
  }
}
