import { beforeEach, describe, expect, it } from '@jest/globals';
import { EsBundleFormat } from '../scopes/es-bundle-format.js';
import { EsBundle } from '../scopes/es-bundle.js';
import { EsVarSymbol } from './es-var.symbol.js';

describe('EsVarSymbol', () => {
  describe('auto-declare', () => {
    let bundle: EsBundle;

    beforeEach(() => {
      bundle = new EsBundle({ format: EsBundleFormat.IIFE });
    });

    it('exports declared variable with initializer', async () => {
      const symbol = new EsVarSymbol('test', { declare: { at: 'exports', value: () => '10 + 3' } });

      bundle.ns.refer(symbol);

      await expect(bundle.emit().asExports()).resolves.toEqual({ test: 13 });
    });
    it('exports variable without initializer', async () => {
      const symbol = new EsVarSymbol('test', { declare: { at: 'exports' } });

      bundle.ns.refer(symbol);

      await expect(bundle.emit().asExports()).resolves.toHaveProperty('test');
    });
  });

  describe('declare', () => {
    let bundle: EsBundle;

    beforeEach(() => {
      bundle = new EsBundle();
    });

    it('declares local constant with initializer', async () => {
      const symbol = new EsVarSymbol('test');

      await expect(bundle.emit(symbol.declare({ value: () => '10 + 3' })).asText()).resolves.toBe(
        'const test = 10 + 3;\n',
      );
    });
    it('declares local variable without initializer', async () => {
      const symbol = new EsVarSymbol('test');

      await expect(bundle.emit(symbol.declare()).asText()).resolves.toBe('let test;\n');
    });
  });
});
