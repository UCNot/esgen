import { beforeEach, describe, expect, it } from '@jest/globals';
import { EsDeclarationNaming, EsDeclaredSymbol } from '../declarations/es-declared.symbol.js';
import { EsBundleFormat } from '../emission/es-bundle-format.js';
import { EsBundle } from '../emission/es-bundle.js';
import { esline } from '../esline.tag.js';
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

    hostClass.declareMember(field);
    bundle.ns.refer(hostClass);

    const { Test } = (await bundle.emit().asExports()) as {
      Test: new () => Record<string, unknown>;
    };

    const result = new Test();

    expect(result).toHaveProperty(field.requestedName);
  });
  it('declares initialized field', async () => {
    const field = new EsField('test');

    hostClass.declareMember(field, { initializer: () => esline`2 + 3` });
    bundle.ns.refer(hostClass);

    const { Test } = (await bundle.emit().asExports()) as {
      Test: new () => Record<string, unknown>;
    };

    const result = new Test();

    expect(result).toEqual({ test: 5 });
  });
});
