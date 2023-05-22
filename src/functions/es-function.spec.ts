import { beforeEach, describe, expect, it } from '@jest/globals';
import { esline } from '../esline.tag.js';
import { EsBundleFormat } from '../scopes/es-bundle-format.js';
import { EsBundle } from '../scopes/es-bundle.js';
import { EsFunction, EsFunctionKind } from './es-function.js';

describe('EsFunction', () => {
  describe('auto-declare', () => {
    let bundle: EsBundle;

    beforeEach(() => {
      bundle = new EsBundle({ format: EsBundleFormat.IIFE });
    });

    it('exports function', async () => {
      const fn = new EsFunction(
        'increase',
        {
          value: { comment: 'Value to increase' },
        },
        {
          declare: {
            at: 'exports',
            body: ({ args: { value } }) => esline`return ${value} + 1;`,
          },
        },
      );

      expect(bundle.ns.refer(fn).getNaming().name).toBe('increase');

      const { increase } = (await bundle.emit().asExports()) as { increase(value: number): number };

      expect(increase(1)).toBe(2);
    });
    it('exports lambda function', async () => {
      const fn = new EsFunction(
        'increase',
        {
          value: { comment: 'Value to increase' },
        },
        {
          declare: {
            at: 'exports',
            as: EsFunctionKind.Var,
            body: ({ args: { value } }) => esline`return ${value} + 1;`,
          },
        },
      );

      expect(bundle.ns.refer(fn).getNaming().name).toBe('increase');

      const { increase } = (await bundle.emit().asExports()) as { increase(value: number): number };

      expect(increase(1)).toBe(2);
    });
  });

  describe('declare', () => {
    let bundle: EsBundle;

    beforeEach(() => {
      bundle = new EsBundle();
    });

    describe('declare', () => {
      it('declares local function', async () => {
        const fn = new EsFunction('test', { arg: {}, '...rest': {} });

        await expect(
          bundle
            .emit(code => {
              code
                .write(
                  fn.declare({ body: fn => esline`return [${fn.args.arg}, ...${fn.args.rest}];` }),
                )
                .write(esline`${fn.call({ arg: '1', rest: ['2', '3'] })};`);
            })
            .asText(),
        ).resolves.toBe(
          `function test(arg, ...rest) {\n`
            + `  return [arg, ...rest];\n`
            + `}\n`
            + `test(1, 2, 3);\n`,
        );
      });
      it('declares async function', async () => {
        const fn = new EsFunction('test', { arg: {}, '...rest': {} });

        await expect(
          bundle
            .emit(code => {
              code
                .write(
                  fn.declare({
                    body: fn => esline`return [${fn.args.arg}, ...${fn.args.rest}];`,
                    async: true,
                  }),
                )
                .write(esline`${fn.call({ arg: '1', rest: ['2', '3'] })};`);
            })
            .asText(),
        ).resolves.toBe(
          `async function test(arg, ...rest) {\n`
            + `  return [arg, ...rest];\n`
            + `}\n`
            + `test(1, 2, 3);\n`,
        );
      });
      it('declares const lambda', async () => {
        const fn = new EsFunction('test', { arg: {}, '...rest': {} });

        await expect(
          bundle
            .emit(code => {
              code
                .write(
                  fn.declare({
                    as: EsFunctionKind.Const,
                    body: fn => esline`return [${fn.args.arg}, ...${fn.args.rest}];`,
                  }),
                )
                .write(esline`${fn.call({ arg: '1', rest: ['2', '3'] })};`);
            })
            .asText(),
        ).resolves.toBe(
          `const test = (arg, ...rest) => {\n`
            + `  return [arg, ...rest];\n`
            + `};\n`
            + `test(1, 2, 3);\n`,
        );
      });
      it('declares lambda variable', async () => {
        const fn = new EsFunction('test', { arg: {}, '...rest': {} });

        await expect(
          bundle
            .emit(code => {
              code
                .write(
                  fn.declare({
                    as: EsFunctionKind.Var,
                    body: fn => esline`return [${fn.args.arg}, ...${fn.args.rest}];`,
                  }),
                )
                .write(esline`${fn.call({ arg: '1', rest: ['2', '3'] })};`);
            })
            .asText(),
        ).resolves.toBe(
          `var test = (arg, ...rest) => {\n`
            + `  return [arg, ...rest];\n`
            + `};\n`
            + `test(1, 2, 3);\n`,
        );
      });
    });
  });
});
