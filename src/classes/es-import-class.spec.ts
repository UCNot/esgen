import { describe, expect, it } from '@jest/globals';
import { esGenerate } from '../es-generate.js';
import { esImportClass } from './es-import-class.js';

describe('esImportClass', () => {
  it('imports function', async () => {
    const fn = esImportClass('test-module', 'Test', { arg1: {}, 'arg2?': {}, '...rest': {} });

    await expect(
      esGenerate(async (code, { ns }) => {
        const { instantiate } = await ns.refer(fn).whenNamed();

        code.line(instantiate({ arg1: '1', arg2: '2', rest: ['3', '4'] }), ';');
      }),
    ).resolves.toBe(
      `
import { Test } from 'test-module';
new Test(
  1,
  2,
  3,
  4,
);
`.trimStart(),
    );
  });
});
