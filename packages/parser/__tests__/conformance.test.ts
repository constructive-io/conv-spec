/**
 * The conformance suite: every `__fixtures__/scenes/X.conv` must parse to exactly
 * `X.json`, and every `__fixtures__/errors/X.conv` must report exactly
 * `X.errors.json`. Another implementation of the format passes the same files.
 *
 * UPDATE_FIXTURES=1 rewrites the expected files from this implementation.
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import { parse } from '../src';
import { banks, FIXTURES, list } from '../test-utils/fixtures';

const update = !!process.env.UPDATE_FIXTURES;

function expectFile(path: string, actual: unknown) {
  const text = JSON.stringify(actual, null, 2) + '\n';
  if (update || !existsSync(path)) writeFileSync(path, text);
  expect(JSON.parse(text)).toEqual(JSON.parse(readFileSync(path, 'utf8')));
}

describe('scenes', () => {
  it.each(list('scenes'))('%s', (file) => {
    const path = join(FIXTURES, 'scenes', file);
    const scene = parse(readFileSync(path, 'utf8'), { source: file, include: banks() });
    expectFile(path.replace(/\.conv$/, '.json'), scene);
  });
});

describe('errors', () => {
  it.each(list('errors'))('%s', (file) => {
    const path = join(FIXTURES, 'errors', file);
    const scene = parse(readFileSync(path, 'utf8'), {
      source: file,
      include: banks(),
      strict: false,
    });
    expect(scene.problems.length).toBeGreaterThan(0);
    expectFile(path.replace(/\.conv$/, '.errors.json'), scene.problems);
  });
});
