import { beforeEach, describe, expect, it } from '@jest/globals';
import { jsStringLiteral } from 'httongue';
import { EsCode } from '../es-code.js';
import { esline } from '../esline.tag.js';
import { EsSignature } from '../functions/es-signature.js';
import { EsBundle } from '../scopes/es-bundle.js';
import { EsClass } from './es-class.js';
import { EsConstructor } from './es-constructor.js';
import { EsField } from './es-field.js';
import { EsMemberVisibility } from './es-member.js';

describe('EsConstructor', () => {
  let bundle: EsBundle;

  beforeEach(() => {
    bundle = new EsBundle();
  });

  it('is available by default without arguments', async () => {
    const hostClass = new EsClass<EsSignature.NoArgs>('Test');

    expect(hostClass.getHandle()).toBeDefined();
    await expect(
      bundle.emit(hostClass.declare(), esline`${hostClass.instantiate()};`).asText(),
    ).resolves.toBe(`class Test {\n}\nnew Test();\n`);
  });
  it('requires to be declared with arguments', () => {
    const hostClass = new EsClass('Test', { classConstructor: { args: { test: {} } } });

    expect(() => hostClass.getHandle()).toThrow(
      new ReferenceError(`constructor(test) is not declared in Test /* [Class] */`),
    );
  });
  it('is inherited from base class', async () => {
    const baseClass = new EsClass('Base', { classConstructor: { args: { test: {} } } });
    const field = new EsField('test', { visibility: EsMemberVisibility.Private });

    field.declareIn(baseClass);
    baseClass.declareConstructor({
      body({ member: { args } }, hostClass) {
        const { set } = hostClass.member(field);

        return esline`${set('this', args.test)};`;
      },
    });

    const hostClass = new EsClass('Test', { baseClass });

    expect(hostClass.getHandle()).toBeDefined();
    await expect(
      bundle
        .emit(
          baseClass.declare(),
          hostClass.declare(),
          esline`${hostClass.instantiate({ test: '1' })};`,
        )
        .asText(),
    ).resolves.toBe(
      `
class Base {
  #test;
  constructor(test) {
    this.#test = test;
  }
}
class Test extends Base {
}
new Test(1);
`.trimStart(),
    );
  });
  it('requires to be declared when arguments differ', () => {
    const baseClass = new EsClass('Base', { classConstructor: { args: { test: {} } } });

    baseClass.declareConstructor({ body: () => EsCode.none });

    const hostClass = new EsClass('Test', {
      baseClass,
      classConstructor: { args: { 'test?': {} } },
    });

    expect(() => hostClass.getHandle()).toThrow(
      new ReferenceError(
        'constructor(test?) of Test /* [Class] */ can not accept arguments from '
          + 'base constructor(test) of Base /* [Class] */',
      ),
    );
  });
  it('allows to change base constructor signature', async () => {
    const baseClass = new EsClass('Base', { classConstructor: { args: { test: {} } } });
    const field = new EsField('test', { visibility: EsMemberVisibility.Private });

    field.declareIn(baseClass);
    baseClass.declareConstructor({
      body({ member: { args } }, hostClass) {
        const { set } = hostClass.member(field);

        return esline`${set('this', args.test)};`;
      },
    });

    const hostClass = new EsClass<EsSignature.NoArgs>('Test', {
      baseClass,
      classConstructor: new EsConstructor({ args: {} }),
    });

    hostClass.declareConstructor({
      body(_, { baseClass }) {
        const superSignature = baseClass!.classConstructor.signature;

        return esline`super${superSignature.call({ test: jsStringLiteral('Test') })};`;
      },
    });
    await expect(
      bundle
        .emit(baseClass.declare(), hostClass.declare(), esline`${hostClass.instantiate()};`)
        .asText(),
    ).resolves.toBe(
      `
class Base {
  #test;
  constructor(test) {
    this.#test = test;
  }
}
class Test extends Base {
  constructor() {
    super('Test');
  }
}
new Test();
`.trimStart(),
    );
  });
});
