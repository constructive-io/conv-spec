/**
 * An author mistake is an error with a line number, what is wrong, and a fix.
 * Each test pins the MESSAGE, because the message is the feature.
 */
import { ConvError, parse } from '../src';

const HEAD =
  '@characters\nDAN: { persona: dan }\n\n@sounds\nBED: { file: music/bed.mp3 }\n' +
  'GLASS: { prompt: "glass", duration: 2 }\n---\n';

function errors(src: string): ConvError {
  try {
    parse(src, { source: 't.conv' });
  } catch (e) {
    if (e instanceof ConvError) return e;
    throw e;
  }
  throw new Error('expected a ConvError');
}

describe('errors', () => {
  it('reports every problem at once, with line numbers', () => {
    const e = errors(HEAD + 'DAN: hi\n[music BED fade-ot:3]\n[GLASS vol:loud]\n');
    expect(e.problems.map((p) => p.line)).toEqual([9, 10]);
    expect(e.message).toContain('t.conv: 2 problems');
    expect(e.message).toContain('line 9: [music BED fade-ot:3]');
  });

  it('suggests the key a typo meant', () => {
    const m = errors(HEAD + '[music BED fade-ot:3]\n').message;
    expect(m).toContain('unknown key `fade-ot`');
    expect(m).toContain('Did you mean `fade-out`?');
    expect(m).toContain('Valid keys:');
  });

  it('rejects values that are not numbers, seeds or times', () => {
    expect(errors(HEAD + '[GLASS vol:loud]\n').message).toContain('`vol:loud` — vol must be a number');
    expect(errors(HEAD + 'DAN[seed:abc]: hi\n').message).toContain(
      '`seed:abc` — a seed must be a whole number'
    );
    expect(errors(HEAD + '[music BED start:soon]\n').message).toContain('seconds or m:ss');
  });

  it('rejects out-of-range values', () => {
    expect(errors(HEAD + '[GLASS pan:3]\n').message).toContain('out of range; use -1 to 1');
  });

  it('names undeclared sounds, with a suggestion', () => {
    const m = errors(HEAD + '[GLAS]\n').message;
    expect(m).toContain("sound `GLAS` isn't declared under @sounds");
    expect(m).toContain('Did you mean `GLASS`?');
  });

  it('does not quietly turn an unknown reverb into a default', () => {
    const m = errors(HEAD + 'DAN[reverb:haul]: hi\n').message;
    expect(m).toContain('not one of: room, hall, cathedral, plate');
    expect(m).toContain('Did you mean `hall`?');
  });

  it('allows one emotion per line', () => {
    expect(errors(HEAD + 'DAN[happy, sad]: hi\n').message).toContain('names 2 emotions');
  });

  it('explains the v1 forms', () => {
    const m = errors('@characters\nHOST: ryan\n\nHOST: hello\npause 0.5\n').message;
    expect(m).toContain('`HOST: { persona: ryan }`');
    expect(m).toContain('`[pause 0.5]`');
  });

  it('hints at case and hyphens in names', () => {
    expect(errors(HEAD + 'dan: hi\n').message).toContain('UPPERCASE: `DAN: hi');
    expect(errors(HEAD + 'MARY-JANE: hi\n').message).toContain('not -: `MARY_JANE');
  });

  it('needs exactly one source per sound', () => {
    expect(errors('@sounds\nX: { duration: 2 }\n---\n').message).toContain('needs a source');
    expect(errors('@sounds\nX: { file: a.wav, prompt: "x" }\n---\n').message).toContain(
      'both `file:` and `prompt:`'
    );
  });

  it('keeps the persona on the character, not the line', () => {
    expect(errors(HEAD + 'DAN[persona:bob]: hi\n').message).toContain("can't be changed per line");
  });

  it('only moves vol mid-scene', () => {
    const m = errors(HEAD + 'DAN: hi\n[music reverb:hall]\n').message;
    expect(m).toContain("can't change mid-scene");
    expect(m).toContain('`music: { reverb: hall }`');
  });

  it('allows any track setting before the first line', () => {
    expect(() => parse(HEAD + '[music reverb:hall]\nDAN: hi\n')).not.toThrow();
  });

  it('rejects unknown tracks and headers', () => {
    expect(errors(HEAD + '[musik BED]\n').message).toContain('unknown track `musik`');
    expect(errors('@charactrs\n').message).toContain('Did you mean `@characters`?');
  });

  it('needs a value for every config key', () => {
    expect(errors('@characters\nDAN: { persona: dan, compress }\n').message).toContain(
      '`compress` needs a value'
    );
  });

  it('collects instead of throwing when not strict', () => {
    const scene = parse(HEAD + '[GLAS]\n', { strict: false });
    expect(scene.problems).toHaveLength(1);
    expect(scene.problems[0].line).toBe(8);
  });
});
