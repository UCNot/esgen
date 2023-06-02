import { describe, expect, it } from '@jest/globals';
import { EsCode } from '../code/es-code.js';
import { EsOutput } from '../code/es-output.js';
import { esEvaluate } from '../es-evaluate.js';
import { esGenerate } from '../es-generate.js';
import { EsBundle } from '../scopes/es-bundle.js';
import { esConst } from './es-const.js';

describe('EsDeclarations', () => {
  it('exports multiple symbols', async () => {
    const symbol1 = esConst('first', `1`, { at: 'exports' });
    const symbol2 = esConst('second', `2`, { at: 'exports' });

    await expect(
      esGenerate((_, { ns }) => {
        ns.refer(symbol1);
        ns.refer(symbol2);
      }),
    ).resolves.toBe(`export const first = 1;\nexport const second = 2;\n`);
  });
  it('renames conflicting exports', async () => {
    const symbol1 = esConst('test', `1`, { at: 'exports' });
    const symbol2 = esConst('test', `2`, { at: 'exports' });

    await expect(
      esGenerate((_, { ns }) => {
        ns.refer(symbol1);
        ns.refer(symbol2);
      }),
    ).resolves.toBe(`export const test = 1;\nconst test$0 = 2;\nexport {\n  test$0 as test,\n};\n`);
  });
  it('prevents declarations when printed', async () => {
    const bundle = new EsBundle();
    const symbol1 = esConst('first', `1`, { at: 'exports' });
    const symbol2 = esConst('second', `2`, { at: 'exports' });

    bundle.ns.refer(symbol1);

    bundle.done();
    await expect(
      new EsOutput()
        .print(
          new EsCode()
            .write(bundle.imports, bundle.declarations.body, bundle.declarations.exports)
            .emit(bundle),
        )
        .asText(),
    ).resolves.toBe(`export const first = 1;\n`);

    expect(() => bundle.ns.refer(symbol2)).toThrow(new TypeError(`Declarations already printed`));
  });

  describe('IIFE', () => {
    it('renames conflicting exports', async () => {
      const symbol1 = esConst('test', `1`, { prefix: '' });
      const symbol2 = esConst('test', `2`, { at: 'exports' });

      await expect(
        esEvaluate((_, { ns }) => {
          expect(ns.refer(symbol1).getNaming().name).toBe('test');
          expect(ns.refer(symbol2).getNaming().name).toBe('test$0');
        }),
      ).resolves.toEqual({ test: 2 });
    });
  });
});
