import { beforeEach, describe, expect, it } from '@jest/globals';
import { EsBundle } from '../scopes/es-bundle.js';
import { esImportFunction } from './es-import-function.js';

describe('esImportFunction', () => {
  let bundle: EsBundle;

  beforeEach(() => {
    bundle = new EsBundle();
  });

  it('imports function', async () => {
    const fn = esImportFunction('test-module', 'test', { arg1: {}, 'arg2?': {}, '...rest': {} });

    await expect(
      bundle
        .emit(async (code, { ns }) => {
          const { call } = await ns.refer(fn).whenNamed();

          code.line(call({ arg1: '1', arg2: '2', rest: ['3', '4'] }), ';');
        })
        .asText(),
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
