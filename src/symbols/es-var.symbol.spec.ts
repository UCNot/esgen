import { describe, expect, it } from '@jest/globals';
import { esEvaluate } from '../es-evaluate.js';
import { esGenerate } from '../es-generate.js';
import { EsVarKind, EsVarSymbol } from './es-var.symbol.js';

describe('EsVarSymbol', () => {
  describe('auto-declare', () => {
    it('exports declared variable with initializer', async () => {
      const symbol = new EsVarSymbol('test', { declare: { at: 'exports', value: () => '10 + 3' } });

      await expect(
        esEvaluate((_, { ns }) => {
          ns.refer(symbol);
        }),
      ).resolves.toEqual({ test: 13 });
    });
    it('exports variable without initializer', async () => {
      const symbol = new EsVarSymbol('test', { declare: { at: 'exports' } });

      await expect(
        esEvaluate((_, { ns }) => {
          ns.refer(symbol);
        }),
      ).resolves.toHaveProperty('test');
    });
  });

  describe('declare', () => {
    it('declares local constant with initializer', async () => {
      const symbol = new EsVarSymbol('test');

      await expect(esGenerate(symbol.declare({ value: () => '10 + 3' }))).resolves.toBe(
        'const test = 10 + 3;\n',
      );
    });
    it('declares local variable without initializer', async () => {
      const symbol = new EsVarSymbol('test');

      await expect(esGenerate(symbol.declare())).resolves.toBe('let test;\n');
    });
    it('declares local variable with var keyword', async () => {
      const symbol = new EsVarSymbol('test');

      await expect(esGenerate(symbol.declare({ as: EsVarKind.Var }))).resolves.toBe('var test;\n');
    });
  });

  describe('const', () => {
    it('declares constant', async () => {
      const symbol = new EsVarSymbol('test');

      await expect(esGenerate(symbol.const())).resolves.toBe('const test;\n');
      await expect(esGenerate(symbol.const({ value: () => '10 + 3' }))).resolves.toBe(
        'const test = 10 + 3;\n',
      );
    });
  });

  describe('let', () => {
    it('declares variable with `let` keyword', async () => {
      const symbol = new EsVarSymbol('test');

      await expect(esGenerate(symbol.let())).resolves.toBe('let test;\n');
      await expect(esGenerate(symbol.let({ value: () => '10 + 3' }))).resolves.toBe(
        'let test = 10 + 3;\n',
      );
    });
  });

  describe('var', () => {
    it('declares variable with `var` keyword', async () => {
      const symbol = new EsVarSymbol('test');

      await expect(esGenerate(symbol.var())).resolves.toBe('var test;\n');
      await expect(esGenerate(symbol.var({ value: () => '10 + 3' }))).resolves.toBe(
        'var test = 10 + 3;\n',
      );
    });
  });
});
