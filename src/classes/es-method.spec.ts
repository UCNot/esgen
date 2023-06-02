import { describe, expect, it } from '@jest/globals';
import { jsStringLiteral } from 'httongue';
import { esline } from '../code/esline.tag.js';
import { esGenerate } from '../es-generate.js';
import { EsSignature } from '../functions/es-signature.js';
import { EsVarSymbol } from '../symbols/es-var.symbol.js';
import { EsClass } from './es-class.js';
import { EsMethod } from './es-method.js';

describe('EsMethod', () => {
  it('declares method', async () => {
    const hostClass: EsClass<EsSignature.NoArgs> = new EsClass('Test', {
      declare: { at: 'bundle' },
    });
    const method = new EsMethod('test', { args: { arg1: {}, 'arg2?': {} } });

    method.declareIn(hostClass, {
      args: { arg2: { declare: naming => esline`${naming} = ${jsStringLiteral('default')}` } },
      body: ({ member: { args } }) => esline`console.log(${args.arg1}, ${args.arg2});`,
    });

    await expect(
      esGenerate(code => {
        const instance = new EsVarSymbol('instance');

        code
          .write(
            instance.declare({
              value: () => hostClass.instantiate(),
            }),
          )
          .write(esline`${hostClass.member(method).call(instance, { arg1: '13' })};`);
      }),
    ).resolves.toBe(
      `
class Test {
  test(
    arg1,
    arg2 = 'default',
  ) {
    console.log(arg1, arg2);
  }
}
const instance = new Test();
instance.test(13);
`.trimStart(),
    );
  });
});
