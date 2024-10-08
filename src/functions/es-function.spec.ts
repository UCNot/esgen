import { describe, expect, it } from '@jest/globals';
import { EsCode } from '../code/es-code.js';
import { esline } from '../code/esline.tag.js';
import { esEvaluate } from '../es-evaluate.js';
import { esGenerate } from '../es-generate.js';
import { EsBundle } from '../scopes/es-bundle.js';
import { EsFunction, EsFunctionKind } from './es-function.js';

describe('EsFunction', () => {
  describe('auto-declare', () => {
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

      expect(new EsBundle().ns.refer(fn).getNaming().name).toBe('increase');

      const { increase } = (await esEvaluate((_, { ns }) => {
        ns.refer(fn);
      })) as { increase(value: number): number };

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

      expect(new EsBundle().ns.refer(fn).getNaming().name).toBe('increase');

      const { increase } = (await esEvaluate((_, { ns }) => {
        ns.refer(fn);
      })) as { increase(value: number): number };

      expect(increase(1)).toBe(2);
    });
  });

  describe('emit', () => {
    it('emits function name', async () => {
      const fn = new EsFunction(
        'test',
        {},
        {
          declare: {
            at: 'bundle',
            body: () => EsCode.none,
          },
        },
      );

      await expect(esGenerate(esline`${fn}();`)).resolves.toBe(
        `
function test() {
}
test();
`.trimStart(),
      );
    });
  });

  describe('declare', () => {
    describe('declare', () => {
      it('declares local function', async () => {
        const fn = new EsFunction('test', { arg: {}, '...rest': {} });

        await expect(
          esGenerate(code => {
            code
              .write(
                fn.declare({ body: fn => esline`return [${fn.args.arg}, ...${fn.args.rest}];` }),
              )
              .write(esline`${fn.call({ arg: '1', rest: ['2', '3'] })};`);
          }),
        ).resolves.toBe(
          `function test(arg, ...rest) {\n` +
            `  return [arg, ...rest];\n` +
            `}\n` +
            `test(1, 2, 3);\n`,
        );
      });
      it('declares async function', async () => {
        const fn = new EsFunction('test', { arg: {}, '...rest': {} });

        await expect(
          esGenerate(code => {
            code
              .write(
                fn.declare({
                  body: fn => esline`return [${fn.args.arg}, ...${fn.args.rest}];`,
                  async: true,
                }),
              )
              .write(esline`${fn.call({ arg: '1', rest: ['2', '3'] })};`);
          }),
        ).resolves.toBe(
          `async function test(arg, ...rest) {\n` +
            `  return [arg, ...rest];\n` +
            `}\n` +
            `test(1, 2, 3);\n`,
        );
      });
      it('declares const lambda', async () => {
        const fn = new EsFunction('test', { arg: {}, '...rest': {} });

        await expect(
          esGenerate(code => {
            code
              .write(
                fn.declare({
                  as: EsFunctionKind.Const,
                  body: fn => esline`return [${fn.args.arg}, ...${fn.args.rest}];`,
                }),
              )
              .write(esline`${fn.call({ arg: '1', rest: ['2', '3'] })};`);
          }),
        ).resolves.toBe(
          `const test = (arg, ...rest) => {\n` +
            `  return [arg, ...rest];\n` +
            `};\n` +
            `test(1, 2, 3);\n`,
        );
      });
      it('declares lambda variable', async () => {
        const fn = new EsFunction('test', { arg: {}, '...rest': {} });

        await expect(
          esGenerate(code => {
            code
              .write(
                fn.declare({
                  as: EsFunctionKind.Var,
                  body: fn => esline`return [${fn.args.arg}, ...${fn.args.rest}];`,
                }),
              )
              .write(esline`${fn.call({ arg: '1', rest: ['2', '3'] })};`);
          }),
        ).resolves.toBe(
          `var test = (arg, ...rest) => {\n` +
            `  return [arg, ...rest];\n` +
            `};\n` +
            `test(1, 2, 3);\n`,
        );
      });
    });
  });

  describe('toString()', () => {
    it('reflects function name, signature, and comments', () => {
      const fn = new EsFunction(
        'increase',
        {
          value: { comment: 'Value to increase' },
        },
        {
          comment: 'Increases value',
          declare: {
            at: 'exports',
            body: ({ args: { value } }) => esline`return ${value} + 1;`,
          },
        },
      );

      expect(fn.toString()).toBe(`increase(value /* Value to increase */) /* Increases value */`);
    });
  });
});
