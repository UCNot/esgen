import { beforeEach, describe, expect, it } from '@jest/globals';
import { asis } from '@proc7ts/primitives';
import { EsBundle } from '../scopes/es-bundle.js';
import { EsNamingHost } from './es-namespace.js';
import { EsNaming, EsSymbol } from './es-symbol.js';

describe('EsSymbol', () => {
  let bundle: EsBundle;

  beforeEach(() => {
    bundle = new EsBundle();
  });

  describe('requestedName', () => {
    it('converted to ECMAScript-safe identifier', () => {
      expect(new TestSymbol('').requestedName).toBe('__');
      expect(new TestSymbol('if').requestedName).toBe('__if__');
      expect(new TestSymbol('if').requestedName).toBe('__if__');
      expect(new TestSymbol('1\0\n').requestedName).toBe('_x31x0xA_');
    });
  });

  describe('emit', () => {
    it('emits symbol name', async () => {
      const symbol = new TestSymbol('test');
      const { name } = symbol.declareIn(bundle);

      await expect(
        bundle
          .emit(code => {
            code.line(symbol, '();');
          })
          .asText(),
      ).resolves.toBe(`${name}();\n`);
    });
  });
});

class TestSymbol extends EsSymbol {

  declareIn({ ns }: EsNamingHost): EsNaming {
    return ns.addSymbol(this, asis);
  }

}
