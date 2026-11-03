import { join } from 'path';

import { fileResolver, main } from '../src';

const FIXTURES = join(__dirname, '../../../__fixtures__');

function run(...argv: string[]) {
  const out: string[] = [];
  const err: string[] = [];
  const code = main(argv, { out: (s) => out.push(s), err: (s) => err.push(s), cwd: FIXTURES });
  return { code, out: out.join('\n'), err: err.join('\n') };
}

describe('conv check', () => {
  it('passes clean scripts', () => {
    const r = run('check', 'scenes/basic.conv', 'scenes/tracks.conv');
    expect(r.code).toBe(0);
    expect(r.out).toContain('2 ok, 0 with problems');
  });

  it('finds banks with --banks', () => {
    expect(run('check', 'scenes/include.conv', '--banks', 'banks').code).toBe(0);
  });

  it('finds ./banks in the cwd by default', () => {
    expect(run('check', 'scenes/include.conv').code).toBe(0);
  });

  it('reports every problem and exits 1', () => {
    const r = run('check', 'errors/typos.conv');
    expect(r.code).toBe(1);
    expect(r.err).toContain('errors/typos.conv: 5 problems');
    expect(r.err).toContain('Did you mean `fade-out`?');
  });

  it('reports a missing file', () => {
    expect(run('check', 'nope.conv').err).toContain('no such file');
  });
});

describe('conv parse', () => {
  it('prints the scene as JSON', () => {
    const r = run('parse', 'scenes/basic.conv');
    expect(r.code).toBe(0);
    expect(JSON.parse(r.out).characters.ALICE).toEqual({ persona: 'alice' });
  });

  it('shows usage on bad arguments', () => {
    expect(run('frobnicate', 'x').code).toBe(2);
    expect(run('--help').out).toContain('conv check');
  });
});

describe('fileResolver', () => {
  const r = fileResolver({ banks: [join(FIXTURES, 'banks')], roots: [FIXTURES] });

  it('reads a bank by name', () => {
    const got = r.resolve('studio', undefined);
    expect('text' in got && got.text).toContain('@sounds');
  });

  it('reads a path relative to the including file', () => {
    const got = r.resolve('../banks/other.sounds', join(FIXTURES, 'scenes/include.conv'));
    expect('id' in got && got.id).toMatch(/other\.sounds$/);
  });

  it('says where it looked', () => {
    const got = r.resolve('missing', undefined);
    expect('tried' in got && got.tried[0]).toMatch(/banks\/missing\.sounds$/);
  });

  it('lists banks', () => {
    expect(r.list()).toEqual(['other', 'studio']);
  });
});
