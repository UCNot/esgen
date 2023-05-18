import { beforeEach, describe, expect, it } from '@jest/globals';
import { EsDeclarationNaming, EsDeclaredSymbol } from '../declarations/es-declared.symbol.js';
import { EsBundleFormat } from '../emission/es-bundle-format.js';
import { EsBundle } from '../emission/es-bundle.js';
import { esline } from '../esline.tag.js';
import { esLocal } from '../symbols/es-local.symbol.js';
import { EsClass } from './es-class.js';
import { EsDeclaredClass } from './es-declared.class.js';
import { EsField } from './es-field.js';

describe('EsField', () => {
  let bundle: EsBundle;
  let hostClass: EsClass<EsDeclarationNaming, EsDeclaredSymbol>;

  beforeEach(() => {
    bundle = new EsBundle({ format: EsBundleFormat.IIFE });
    hostClass = new EsDeclaredClass('Test', { exported: true });
  });

  it('declares field without initializer', async () => {
    const field = new EsField('test field\n');

    field.declareIn(hostClass);
    bundle.ns.refer(hostClass);

    const { Test } = (await bundle.emit().asExports()) as {
      Test: new () => Record<string, unknown>;
    };

    const result = new Test();

    expect(result).toHaveProperty(field.requestedName);
  });
  it('declares initialized field', async () => {
    const field = new EsField('test');

    field.declareIn(hostClass, { initializer: () => esline`2 + 3` });
    bundle.ns.refer(hostClass);

    const { Test } = (await bundle.emit().asExports()) as {
      Test: new () => Record<string, unknown>;
    };

    const result = new Test();

    expect(result).toEqual({ test: 5 });
  });

  describe('handle', () => {
    it('accesses field value', async () => {
      const bundle = new EsBundle();
      const field = new EsField('test');

      field.declareIn(hostClass, { initializer: () => esline`2 + 3` });

      await expect(
        bundle
          .emit(code => {
            const handle = hostClass.member(field);
            const instance = esLocal('instance');

            code
              .write(
                instance.declare(({ naming }) => esline`const ${naming} = new ${hostClass}();`),
              )
              .inline(handle.set(instance, esline`${handle.get(instance)} + 1`), `;`);
          })
          .asText(),
      ).resolves.toBe(
        `export class Test {\n`
          + `  test = 2 + 3;\n`
          + '}\n'
          + `const instance = new Test();\n`
          + `instance.test = instance.test + 1;\n`,
      );
    });
  });
});
