import { parse } from '@conversation/spec';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';

import { main } from '../src';

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

  it('names only commands and options the command has', () => {
    const help: string[] = [];
    main(['--help'], { out: (s) => help.push(s), err: () => undefined, cwd: ROOT });
    const usage = help.join('\n');
    const uses = blocks('sh')
      .join('\n')
      .split('\n')
      .map((line) => line.match(/^(?:npx @conversation\/cli|conv|node packages\/cli\/dist\/cli\.js) (\S+)(.*)$/))
      .filter((match): match is RegExpMatchArray => match !== null);
    expect(uses.length).toBeGreaterThanOrEqual(4);
    for (const [line, command, rest] of uses) {
      expect([line, usage.includes(`conv ${command} `)]).toEqual([line, true]);
      for (const option of rest.split('#')[0].match(/--[a-z-]+/g) ?? []) {
        expect([line, usage.includes(option)]).toEqual([line, true]);
      }
    }
  });

  it('shows the problems the command really prints', () => {
    const shown = blocks('text');
    expect(shown.length).toBe(1);
    const err: string[] = [];
    const code = main(['check', '__fixtures__/errors/typos.conv'], { out: () => undefined, err: (s) => err.push(s), cwd: ROOT });
    expect(code).toBe(1);
    expect(shown[0].trim()).toBe(err.join('\n').trim());
  });

  it('names only packages that are here', () => {
    const here = readdirSync(join(ROOT, 'packages')).map(
      (folder) => JSON.parse(readFileSync(join(ROOT, 'packages', folder, 'package.json'), 'utf8')).name
    );
    const pages = [SKILL, ...['README.md', 'AGENTS.md', 'SPEC.md', 'packages/cli/README.md', 'packages/parser/README.md'].map((name) => join(ROOT, name))];
    for (const page of pages) {
      const named = new Set(readFileSync(page, 'utf8').match(/@conversation\/[a-z-]+/g) ?? []);
      for (const name of named) expect([page, name, here.includes(name)]).toEqual([page, name, true]);
    }
    expect(text).toContain('@conversation/cli');
    expect(text).toContain('@conversation/spec');
  });

  it('is where the agent guide and the README say it is', () => {
    for (const name of ['AGENTS.md', 'README.md']) {
      expect(readFileSync(join(ROOT, name), 'utf8')).toContain('.agents/skills/conv');
    }
  });
});
