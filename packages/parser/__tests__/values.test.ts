import { parse } from '../src';

const scene = (body: string, head = '') =>
  parse(
    '@characters\nDAN: { persona: dan }\n@sounds\nBED: { file: b.mp3 }\n' + head + '---\n' + body
  );

describe('values', () => {
  it('coerces by key: numbers, booleans, seconds, track lists', () => {
    const s = scene('[music BED start:1:02.5, for:20 hold]\n', '@tracks\nroom: { duck-under: dialogue+music, loop: yes }\n');
    expect(s.items[0]).toMatchObject({
      type: 'track',
      action: 'play',
      overrides: { start: 62.5, for: 20, hold: true },
    });
    expect(s.tracks.room).toEqual({ duck_under: ['dialogue', 'music'], loop: true });
  });

  it('reads at: as flow, offset or absolute', () => {
    const s = scene('[BED]\n[BED at:+2]\n[BED at:18.5]\n');
    expect(s.items.map((i) => (i as any).overrides.at)).toEqual([
      undefined,
      { mode: 'offset', seconds: 2 },
      { mode: 'absolute', seconds: 18.5 },
    ]);
  });

  it('keeps commas inside quoted values', () => {
    const s = parse('@sounds\nCITY: { prompt: "street, cars, horns", duration: 4 }\n---\n');
    expect(s.sounds.CITY).toEqual({ prompt: 'street, cars, horns', duration: 4 });
  });

  it('treats voice: and speaker: as persona', () => {
    const s = parse('@characters\nBOB: { voice: Bob }\n---\nBOB: hi\n');
    expect(s.characters.BOB.persona).toBe('bob');
  });

  it('plays a bare cue on the track its sound names', () => {
    const s = parse('@sounds\nRAIN: { file: r.wav, track: ambience }\n---\n[RAIN]\n');
    expect(s.items[0]).toMatchObject({ type: 'cue', sound: 'RAIN', track: 'ambience' });
  });

  it('folds trailing punctuation into the span before it', () => {
    const s = scene('DAN: {firm: we need to talk}.\n');
    expect((s.items[0] as any).segments).toEqual([
      { type: 'text', text: 'we need to talk.', overrides: { emotion: 'firm' } },
    ]);
  });

  it('parses a line with no markers to one text segment', () => {
    const s = scene('DAN: Just words, nothing else.\n');
    expect((s.items[0] as any).segments).toEqual([
      { type: 'text', text: 'Just words, nothing else.', overrides: {} },
    ]);
  });
});
