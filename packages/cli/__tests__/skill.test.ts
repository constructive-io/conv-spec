import { parse } from 'conv-parser';
import { existsSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';

const ROOT = join(__dirname, '../../..');
const SKILL = join(ROOT, '.agents/skills/conv/SKILL.md');
const text = readFileSync(SKILL, 'utf8');

function blocks(language: string): string[] {
  const found: string[] = [];
  const fence = new RegExp('^```' + language + '\\n([\\s\\S]*?)^```$', 'gm');
  for (const match of text.matchAll(fence)) found.push(match[1]);
  return found;
}

describe('the conv skill', () => {
  it('says what it is', () => {
    const front = text.split('---')[1];
    expect(front).toContain('name: conv\n');
    expect(front).toContain('description: ');
  });

  it('shows only scripts that parse', () => {
    const scripts = blocks('conv');
    expect(scripts.length).toBeGreaterThanOrEqual(3);
    for (const script of scripts) {
      expect(parse(script, { source: 'SKILL.md' }).problems).toEqual([]);
    }
  });

  it('links only to what is there', () => {
    const links = [...text.matchAll(/\]\((\.[^)#]*)/g)].map((match) => match[1]);
    expect(links.length).toBeGreaterThan(3);
    for (const link of links) {
      expect([link, existsSync(resolve(dirname(SKILL), link))]).toEqual([link, true]);
    }
  });

  it('is where the agent guide and the README say it is', () => {
    for (const name of ['AGENTS.md', 'README.md']) {
      expect(readFileSync(join(ROOT, name), 'utf8')).toContain('.agents/skills/conv');
    }
  });
});
