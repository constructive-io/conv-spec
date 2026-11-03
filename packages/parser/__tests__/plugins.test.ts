import { ConvPlugin, defaultPlugins, effects, named, num, parse, str } from '../src';

describe('plugins', () => {
  it('adds a directive that produces a mark', () => {
    const chapters: ConvPlugin = {
      name: 'chapters',
      directives: {
        chapter(args, ctx) {
          if (!args) return ctx.error('`[chapter]` needs a title');
          return { title: args };
        },
      },
    };
    const s = parse('[chapter The Attic]\n', { plugins: [...defaultPlugins, chapters] });
    expect(s.items).toEqual([{ type: 'mark', line: 1, kind: 'chapter', data: { title: 'The Attic' } }]);
    expect(() => parse('[chapter]\n', { plugins: [chapters] })).toThrow(/needs a title/);
  });

  it('makes a directive name unusable as a track', () => {
    const p: ConvPlugin = { name: 'p', directives: { cue: () => ({}) } };
    expect(() => parse('@tracks\ncue: { level: -20 }\n', { plugins: [p] })).toThrow(/reserved word/);
  });

  it('adds keys to any context, validated and coerced like core keys', () => {
    const rendering: ConvPlugin = {
      name: 'rendering',
      keys: { line: { engine: str(), rate: num(0.5, 2) } },
    };
    const s = parse('@characters\nDAN: { persona: dan }\n---\nDAN[rate:0.9, engine:fast]: hi\n', {
      plugins: [...defaultPlugins, rendering],
    });
    expect((s.items[0] as any).overrides).toEqual({ rate: 0.9, engine: 'fast' });
    expect(() =>
      parse('@characters\nDAN: { persona: dan }\n---\nDAN[rate:9]: hi\n', { plugins: [rendering] })
    ).toThrow(/out of range/);
  });

  it('extends named enums across plugins', () => {
    const spring: ConvPlugin = { name: 'spring', enums: { reverb: ['spring'] } };
    const src = '@characters\nDAN: { persona: dan, reverb: spring }\n';
    expect(() => parse(src)).toThrow(/not one of/);
    expect(parse(src, { plugins: [...defaultPlugins, spring] }).characters.DAN.reverb).toBe('spring');
  });

  it('configures effects', () => {
    const src = '@tracks\nhall2: { reverb: vault }\n';
    expect(parse(src, { plugins: [effects({ reverbPresets: ['vault'] })] }).tracks.hall2.reverb).toBe(
      'vault'
    );
  });

  it('adds tracks with their own rules', () => {
    const phone: ConvPlugin = {
      name: 'phone',
      tracks: ['phone'],
      keys: { play: { ring: named('rings') } },
      enums: { rings: ['short', 'long'] },
      trackRules: {
        phone(item, ctx) {
          if (item.action === 'play' && !item.overrides.ring) ctx.error('a phone play needs `ring:`');
        },
      },
    };
    const src = '@sounds\nRING: { file: r.wav }\n---\n';
    expect(parse(src + '[phone RING ring:long]\n', { plugins: [phone] }).items[0]).toMatchObject({
      track: 'phone',
      overrides: { ring: 'long' },
    });
    expect(() => parse(src + '[phone RING]\n', { plugins: [phone] })).toThrow(/needs `ring:`/);
  });

  it('runs finalizers over the finished scene', () => {
    const noSilence: ConvPlugin = {
      name: 'no-long-pauses',
      finalize(scene, ctx) {
        for (const it of scene.items) {
          if (it.type === 'pause' && it.seconds > 5) ctx.problem(it, 'pauses over 5 s lose the listener');
        }
      },
    };
    expect(() => parse('[pause 9]\n', { plugins: [noSilence] })).toThrow(/line 1: \[pause 9\]/);
  });

  it('refuses two plugins claiming one directive', () => {
    const a: ConvPlugin = { name: 'a', directives: { x: () => ({}) } };
    const b: ConvPlugin = { name: 'b', directives: { x: () => ({}) } };
    expect(() => parse('', { plugins: [a, b] })).toThrow(/"a" and "b" both define/);
  });

  it('parses the core grammar with no plugins at all', () => {
    expect(() => parse('[slide intro]\n', { plugins: [] })).toThrow(/unknown track `slide`/);
    const s = parse('@characters\nDAN: { persona: dan }\n---\nDAN: hi\n', { plugins: [] });
    expect(s.items).toHaveLength(1);
  });
});
