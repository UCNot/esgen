import { beforeEach, describe, expect, it } from '@jest/globals';
import { EsBundleFormat } from '../scopes/es-bundle-format.js';
import { EsBundle } from '../scopes/es-bundle.js';
import { esConst } from './es-const.js';

describe('EsDeclarations', () => {
  let bundle: EsBundle;

  beforeEach(() => {
    bundle = new EsBundle();
  });

  it('exports multiple symbols', async () => {
    const symbol1 = esConst('first', `1`, { exported: true });
    const symbol2 = esConst('second', `2`, { exported: true });

    bundle.ns.refer(symbol1);
    bundle.ns.refer(symbol2);

    await expect(bundle.emit().asText()).resolves.toBe(
      `export const first = 1;\nexport const second = 2;\n`,
    );
  });
  it('renames conflicting exports', async () => {
    const symbol1 = esConst('test', `1`, { prefix: '' });
    const symbol2 = esConst('test', `2`, { exported: true });

    expect(bundle.ns.refer(symbol1).getNaming().name).toBe('test');
    expect(bundle.ns.refer(symbol2).getNaming().name).toBe('test$0');

    await expect(bundle.emit().asText()).resolves.toBe(
      `const test = 1;\nconst test$0 = 2;\nexport {\n  test$0 as test,\n};\n`,
    );
  });
  it('prevents declarations when printed', async () => {
    const symbol1 = esConst('first', `1`, { exported: true });
    const symbol2 = esConst('second', `2`, { exported: true });

    bundle.ns.refer(symbol1);

    await expect(bundle.emit().asText()).resolves.toBe(`export const first = 1;\n`);

    expect(() => bundle.ns.refer(symbol2)).toThrow(new TypeError(`Declarations already printed`));
  });

  describe('IIFE', () => {
    it('renames conflicting exports', async () => {
      const bundle = new EsBundle({ format: EsBundleFormat.IIFE });
      const symbol1 = esConst('test', `1`, { prefix: '' });
      const symbol2 = esConst('test', `2`, { exported: true });

      expect(bundle.ns.refer(symbol1).getNaming().name).toBe('test');
      expect(bundle.ns.refer(symbol2).getNaming().name).toBe('test$0');

      await expect(bundle.emit().asExports()).resolves.toEqual({ test: 2 });
    });
  });
});
