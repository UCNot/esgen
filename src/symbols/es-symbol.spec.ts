import { beforeEach, describe, expect, it } from '@jest/globals';
import { EsBundle } from '../emission/es-bundle.js';
import { EsSymbol } from './es-symbol.js';

describe('EsSymbol', () => {
  let bundle: EsBundle;

  beforeEach(() => {
    bundle = new EsBundle();
  });

  describe('emit', () => {
    it('emits bound symbol name', async () => {
      const symbol = new EsSymbol('test');
      const name = bundle.ns.bindSymbol(symbol);

      await expect(
        bundle
          .emit(code => {
            code.inline(symbol, '();');
          })
          .asText(),
      ).resolves.toBe(`${name}();\n`);
    });
  });
});
