import { beforeEach, describe, expect, it } from '@jest/globals';
import { esline } from '../esline.tag.js';
import { EsSignature } from '../functions/es-signature.js';
import { EsBundleFormat } from '../scopes/es-bundle-format.js';
import { EsBundle } from '../scopes/es-bundle.js';
import { EsSymbol } from '../symbols/es-symbol.js';
import { EsClass } from './es-class.js';
import { EsField } from './es-field.js';

describe('EsField', () => {
  let bundle: EsBundle;
  let hostClass: EsClass<EsSignature.NoArgs>;

  beforeEach(() => {
    bundle = new EsBundle({ format: EsBundleFormat.IIFE });
    hostClass = new EsClass('Test', { declare: { at: 'exports' } });
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
            const instance = new EsSymbol('instance');

            code
              .write(
                instance.requestDeclaration({
                  as: ({ naming }) => [esline`const ${naming} = new ${hostClass}();`, naming],
                }),
              )
              .line(handle.set(instance, esline`${handle.get(instance)} + 1`), `;`);
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
