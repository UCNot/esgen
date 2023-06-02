import { describe, expect, it } from '@jest/globals';
import { esGenerate } from '../es-generate.js';
import { esImportFunction } from './es-import-function.js';

describe('esImportFunction', () => {
  it('imports function', async () => {
    const fn = esImportFunction('test-module', 'test', { arg1: {}, 'arg2?': {}, '...rest': {} });

    await expect(
      esGenerate(async (code, { ns }) => {
        const { call } = await ns.refer(fn).whenNamed();

        code.line(call({ arg1: '1', arg2: '2', rest: ['3', '4'] }), ';');
      }),
    ).resolves.toBe(
      `
import { test } from 'test-module';
test(
  1,
  2,
  3,
  4,
);
`.trimStart(),
    );
  });
});
