import { beforeEach, describe, expect, it } from '@jest/globals';
import { EsBundle } from '../emission/es-bundle.js';
import { EsNaming, EsSymbol } from './es-symbol.js';

describe('EsSymbol', () => {
  let bundle: EsBundle;

  beforeEach(() => {
    bundle = new EsBundle();
  });

  describe('emit', () => {
    it('emits symbol name', async () => {
      const symbol = new TestSymbol('test');
      const { name } = bundle.ns.nameSymbol(symbol);

      await expect(
        bundle
          .emit(code => {
            code.inline(symbol, '();');
          })
          .asText(),
      ).resolves.toBe(`${name}();\n`);
    });
  });

  describe('toString', () => {
    it('allows to omit tag', () => {
      expect(new TestSymbol('test').toString({ tag: null }).toString()).toBe('test');
    });
    it('allows to override comment', () => {
      expect(
        new TestSymbol('test', { comment: 'Some comment' })
          .toString({ comment: 'More info' })
          .toString(),
      ).toBe('test /* [Symbol] More info */');
    });
  });
});

class TestSymbol extends EsSymbol {

  override bind(naming: EsNaming): EsNaming {
    return naming;
  }

}
