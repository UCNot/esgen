import { describe, expect, it } from '@jest/globals';
import { esEvaluate } from '../es-evaluate.js';
import { esGenerate } from '../es-generate.js';
import { EsBundleFormat } from '../scopes/es-bundle-format.js';
import { esConst } from './es-const.js';

describe('esConst', () => {
  it('declares constant', async () => {
    const symbol = esConst('TEST', `13`);

    await expect(
      esGenerate(code => {
        code.line(`console.log(`, symbol, ');');
      }),
    ).resolves.toBe(`const CONST_TEST = 13;\nconsole.log(CONST_TEST);\n`);
  });
  it('declares constant with unsafe name', async () => {
    const symbol = esConst('1\0 \n', `42`, { prefix: '' });

    await expect(
      esGenerate(code => {
        code.line(`console.log(`, symbol, ');');
      }),
    ).resolves.toBe(`const _x31x0x20xA_ = 42;\nconsole.log(_x31x0x20xA_);\n`);
  });
  it('declares constant with keyword name', async () => {
    const symbol = esConst('new', `43`, { prefix: '' });

    await expect(
      esGenerate(code => {
        code.line(`console.log(`, symbol, ');');
      }),
    ).resolves.toBe(`const __new__ = 43;\nconsole.log(__new__);\n`);
  });
  it('declares referred constant before referrer', async () => {
    const symbol1 = esConst('1', `1`);
    const symbol2 = esConst('2', `CONST_1 + 1`, { refers: symbol1 });

    await expect(
      esGenerate(code => {
        code.line(`console.log(`, symbol2, ', ', symbol1, ');');
      }),
    ).resolves.toBe(
      `const CONST_1 = 1;\nconst CONST_2 = CONST_1 + 1;\nconsole.log(CONST_2, CONST_1);\n`,
    );
  });
  it('caches symbol with the same identifier', () => {
    const symbol = esConst('TEST1', '123');

    expect(esConst('TEST2', '123')).toBe(symbol);
  });
  it('does not cache exported symbol with the same identifier', () => {
    const symbol = esConst('TEST', '123', { at: 'exports' });

    expect(esConst('TEST', '123', { at: 'exports' })).not.toBe(symbol);
  });
  it('does not cache symbol referring another one', () => {
    const symbol = esConst('TEST', '123', { refers: esConst('REF', '991') });

    expect(esConst('TEST', '123', { refers: esConst('REF', '992') })).not.toBe(symbol);
  });

  describe('ES2015', () => {
    it('exports constant', async () => {
      const symbol = esConst('TEST', `13`, { at: 'exports' });

      await expect(
        esGenerate({ format: EsBundleFormat.ES2015 }, (_, { ns }) => {
          ns.refer(symbol);
        }),
      ).resolves.toBe(`export const TEST = 13;\n`);
    });
  });

  describe('IIFE', () => {
    it('exports constant', async () => {
      const symbol = esConst('TEST', `13`, { at: 'exports' });

      await expect(
        esEvaluate((_, { ns }) => {
          ns.refer(symbol);
        }),
      ).resolves.toEqual({ TEST: 13 });
    });
  });
});
