import { beforeEach, describe, expect, it } from '@jest/globals';
import { esline } from '../esline.tag.js';
import { EsSignature } from '../functions/es-signature.js';
import { EsBundleFormat } from '../scopes/es-bundle-format.js';
import { EsBundle } from '../scopes/es-bundle.js';
import { EsVarSymbol } from '../symbols/es-var.symbol.js';
import { EsClass } from './es-class.js';
import { EsProperty, EsPropertyDeclaration } from './es-property.js';

describe('EsProperty', () => {
  let hostClass: EsClass<EsSignature.NoArgs>;
  let property: EsProperty;

  beforeEach(() => {
    hostClass = new EsClass('Test', { declare: { at: 'exports' } });
    property = new EsProperty('property');
  });

  it('automatically declares getter and setter', async () => {
    const instance = await newInstance();

    expect(instance).toHaveProperty('property');

    instance.property = 'test';
    expect(instance.property).toBe('test');
  });

  describe('read-only', () => {
    it('reads property', async () => {
      const instance = await newInstance({ get: () => `return 13;` });

      expect(instance).toHaveProperty('property');
      expect(instance.property).toBe(13);
    });
    it('allows property read', async () => {
      const handle = property.declareIn(hostClass, { get: () => `return 13;` });

      await expect(
        new EsBundle()
          .emit(code => {
            const instance = new EsVarSymbol('instance');

            code
              .line(instance.declare({ value: () => hostClass.instantiate() }))
              .line('console.log(', handle.get(instance), ');');
          })
          .asText(),
      ).resolves.toBe(
        `
export class Test {
  get property() {
    return 13;
  }
}
const instance = new Test();
console.log(instance.property);
`.trimStart(),
      );
    });
    it('prohibits property write', () => {
      const handle = property.declareIn(hostClass, { get: () => `return 13;` });

      expect(handle.readable).toBe(true);
      expect(handle.writable).toBe(false);
      expect(() => handle.set('instance', '13')).toThrow(
        new TypeError('.property is not writable'),
      );
    });
  });

  describe('write-only', () => {
    it('reads property assignment', async () => {
      const instance = await newInstance({ set: value => esline`this.val = ${value};` });

      expect(instance).toHaveProperty('property');

      instance.property = 'test';
      expect(instance.val).toBe('test');
    });
    it('allows property assignment', async () => {
      const handle = property.declareIn(hostClass, { set: value => esline`this.val = ${value};` });

      await expect(
        new EsBundle()
          .emit(code => {
            const instance = new EsVarSymbol('instance');

            code
              .line(instance.declare({ value: () => hostClass.instantiate() }))
              .line(handle.set(instance, '13'), ';');
          })
          .asText(),
      ).resolves.toBe(
        `
export class Test {
  set property(value) {
    this.val = value;
  }
}
const instance = new Test();
instance.property = 13;
`.trimStart(),
      );
    });
    it('prohibits property read', () => {
      const handle = property.declareIn(hostClass, { set: value => esline`this.val = ${value};` });

      expect(handle.readable).toBe(false);
      expect(handle.writable).toBe(true);
      expect(() => handle.get('instance')).toThrow(new TypeError('.property is not readable'));
    });
  });

  async function newInstance(
    declaration?: EsPropertyDeclaration,
  ): Promise<{ property: unknown; val: unknown }> {
    const bundle = new EsBundle({ format: EsBundleFormat.IIFE });

    property.declareIn(hostClass, declaration);
    bundle.ns.refer(hostClass);

    const { Test } = (await bundle.emit().asExports()) as {
      Test: new () => { property: unknown; val: unknown };
    };

    return new Test();
  }
});
