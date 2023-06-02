import { beforeEach, describe, expect, it } from '@jest/globals';
import { esline } from '../code/esline.tag.js';
import { esEvaluate } from '../es-evaluate.js';
import { esGenerate } from '../es-generate.js';
import { EsSignature } from '../functions/es-signature.js';
import { EsVarSymbol } from '../symbols/es-var.symbol.js';
import { EsClass } from './es-class.js';
import { EsField } from './es-field.js';

describe('EsField', () => {
  let hostClass: EsClass<EsSignature.NoArgs>;

  beforeEach(() => {
    hostClass = new EsClass('Test', { declare: { at: 'exports' } });
  });

  it('declares field without initializer', async () => {
    const field = new EsField('test field\n');

    field.declareIn(hostClass);

    const { Test } = (await esEvaluate((_, { ns }) => {
      ns.refer(hostClass);
    })) as {
      Test: new () => Record<string, unknown>;
    };

    const result = new Test();

    expect(result).toHaveProperty(field.requestedName);
  });
  it('declares initialized field', async () => {
    const field = new EsField('test');

    field.declareIn(hostClass, { initializer: () => esline`2 + 3` });

    const { Test } = (await esEvaluate((_, { ns }) => {
      ns.refer(hostClass);
    })) as {
      Test: new () => Record<string, unknown>;
    };

    const result = new Test();

    expect(result).toEqual({ test: 5 });
  });

  describe('handle', () => {
    it('accesses field value', async () => {
      const field = new EsField('test');

      field.declareIn(hostClass, { initializer: () => esline`2 + 3` });

      await expect(
        esGenerate(code => {
          const handle = hostClass.member(field);
          const instance = new EsVarSymbol('instance');

          code
            .write(
              instance.declare({
                value: () => hostClass.instantiate(),
              }),
            )
            .line(handle.set(instance, esline`${handle.get(instance)} + 1`), `;`);
        }),
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
