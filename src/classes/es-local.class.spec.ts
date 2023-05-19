import { beforeEach, describe, expect, it } from '@jest/globals';
import { EsBundle } from '../emission/es-bundle.js';
import { esline } from '../esline.tag.js';
import { EsSignature } from '../functions/es-signature.js';
import { esLocal } from '../symbols/es-local.symbol.js';
import { EsLocalClass } from './es-local.class.js';

describe('EsLocalClass', () => {
  let bundle: EsBundle;

  beforeEach(() => {
    bundle = new EsBundle();
  });

  describe('declare', () => {
    it('declares local class', async () => {
      const cls = new EsLocalClass<EsSignature.NoArgs>('Test');

      await expect(
        bundle
          .emit(
            cls.declare(),
            esLocal('instance').declare(({ naming }) => esline`const ${naming} = new ${cls}();`),
          )
          .asText(),
      ).resolves.toBe(`class Test {\n}\nconst instance = new Test();\n`);
    });
  });
});
