import { beforeEach, describe, expect, it } from '@jest/globals';
import { jsStringLiteral } from 'httongue';
import { esline } from '../esline.tag.js';
import { EsSignature } from '../functions/es-signature.js';
import { EsBundle } from '../scopes/es-bundle.js';
import { EsSymbol } from '../symbols/es-symbol.js';
import { EsClass } from './es-class.js';
import { EsMethod } from './es-method.js';

describe('EsMethod', () => {
  let bundle: EsBundle;

  beforeEach(() => {
    bundle = new EsBundle();
  });

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
      bundle
        .emit(code => {
          const instance = new EsSymbol('instance');

          code
            .write(
              instance.requestDeclaration({
                as: ({ naming }) => [esline`const ${naming} = ${hostClass.instantiate()};`, naming],
              }),
            )
            .write(esline`${hostClass.member(method).call(instance, { arg1: '13' })};`);
        })
        .asText(),
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
