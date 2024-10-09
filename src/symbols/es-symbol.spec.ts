import { describe, expect, it } from '@jest/globals';
import { asis } from '@proc7ts/primitives';
import { esGenerate } from '../es-generate.js';
import { EsNamingHost } from './es-namespace.js';
import { EsNaming, EsSymbol } from './es-symbol.js';

describe('EsSymbol', () => {
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

      await expect(
        esGenerate((code, scope) => {
          symbol.declareIn(scope);
          code.line(symbol, '();');
        }),
      ).resolves.toBe(`test();\n`);
    });
  });
});

class TestSymbol extends EsSymbol {
  declareIn({ ns }: EsNamingHost): EsNaming {
    return ns.addSymbol(this, asis);
  }
}
