import { memoryResolver, parse } from '../src';

const BANK = '@sounds\nBED: { file: a.mp3 }\nSTING: { file: s.mp3 }\n@tracks\nroom: { reverb: room }\n';

describe('@include', () => {
  it('brings in sounds and tracks, and the script wins', () => {
    const s = parse('@include bank\n@sounds\nBED: { file: mine.mp3 }\n---\n[music BED]\n[STING]\n', {
      include: memoryResolver({ bank: BANK }),
    });
    expect(s.sounds.BED.file).toBe('mine.mp3');
    expect(s.sounds.STING.file).toBe('s.mp3');
    expect(s.tracks.room).toEqual({ reverb: 'room' });
    expect(s.index.sound.STING).toEqual({ line: 1, include: 'bank' });
  });

  it('rejects two banks defining one name, unless the script settles it', () => {
    const include = memoryResolver({ a: '@sounds\nX: { file: a }\n', b: '@sounds\nX: { file: b }\n' });
    expect(() => parse('@include a\n@include b\n---\n', { include })).toThrow(/comes from both `a` and `b`/);
    expect(() => parse('@include a\n@include b\n@sounds\nX: { file: c }\n---\n', { include })).not.toThrow();
  });

  it('reports a missing bank with a suggestion', () => {
    expect(() => parse('@include podcats\n---\n', { include: memoryResolver({ podcast: BANK }) })).toThrow(
      /can't find `podcats`.*Did you mean `podcast`\?/s
    );
  });

  it('reports cycles', () => {
    const include = memoryResolver({ a: '@include b\n', b: '@include a\n' });
    expect(() => parse('@include a\n---\n', { include })).toThrow(/goes round in a circle/);
  });

  it('keeps characters and dialogue out of banks', () => {
    const include = memoryResolver({ bad: '@characters\nDAN: { persona: dan }\n' });
    expect(() => parse('@include bad\n---\n', { include })).toThrow(/has problems — fix them there/);
  });

  it('needs a resolver', () => {
    expect(() => parse('@include bank\n---\n')).toThrow(/no include resolver/);
  });

  it('belongs in the header', () => {
    expect(() =>
      parse('---\n@include bank\n', { include: memoryResolver({ bank: BANK }) })
    ).toThrow(/belongs in the header/);
  });
});
