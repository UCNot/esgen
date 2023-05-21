import { beforeEach, describe, expect, it } from '@jest/globals';
import { EsBundle } from '../scopes/es-bundle.js';
import { esImportClass } from './es-import-class.js';

describe('esImportClass', () => {
  let bundle: EsBundle;

  beforeEach(() => {
    bundle = new EsBundle();
  });

  it('imports function', async () => {
    const fn = esImportClass('test-module', 'Test', { arg1: {}, 'arg2?': {}, '...rest': {} });

    await expect(
      bundle
        .emit(async (code, { ns }) => {
          const { instantiate } = await ns.refer(fn).whenNamed();

          code.line(instantiate({ arg1: '1', arg2: '2', rest: ['3', '4'] }), ';');
        })
        .asText(),
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
