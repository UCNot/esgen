import { beforeEach, describe, expect, it } from '@jest/globals';
import { EsBundle } from '../emission/es-bundle.js';
import { esLocal } from './es-local.symbol.js';

describe('EsLocalSymbol', () => {
  let bundle: EsBundle;

  beforeEach(() => {
    bundle = new EsBundle();
  });

  describe('declare', () => {
    it('declares local', async () => {
      const local = esLocal('test');

      await expect(
        bundle
          .emit(code => {
            code.scope(code => {
              code
                .write(
                  local.declare({ declareLocal: ({ naming: { name } }) => `let ${name} = 13;` }),
                )
                .inline(`console.log(`, local, `);`);
            });
          })
          .asText(),
      ).resolves.toBe(`let test = 13;\nconsole.log(test);\n`);
    });
    it('prohibits local re-declaration', async () => {
      const local = esLocal('test');

      await expect(
        bundle
          .emit(code => {
            code.scope({ ns: { comment: 'Local' } }, code => {
              code
                .write(
                  local.declare(({ naming: { name } }) => `let ${name} = 1;`),
                  local.declare(({ naming: { name } }) => `let ${name} = 2;`),
                )
                .inline(`console.log(`, local, `);`);
            });
          })
          .asText(),
      ).rejects.toThrow(new TypeError(`Can not rename test /* [Local] */ in /* Local */`));
    });
  });

  describe('toString', () => {
    it(`reflects requested name`, () => {
      expect(esLocal('testSymbol').toString()).toBe(`testSymbol /* [Local] */`);
    });
    it(`reflects comment`, () => {
      expect(
        esLocal('testSymbol', {
          comment: 'Test',
        }).toString(),
      ).toBe(`testSymbol /* [Local] Test */`);
    });
  });
});
