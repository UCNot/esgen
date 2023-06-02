import { describe, expect, it } from '@jest/globals';
import { esline } from '../code/esline.tag.js';
import { esGenerate } from '../es-generate.js';
import { EsCallable } from './es-callable.js';

describe('EsCallable', () => {
  describe('lambda', () => {
    it('emits lambda expression', async () => {
      const fn = new EsCallable({ arg: {}, '...rest': {} });

      await expect(
        esGenerate(fn.lambda(fn => esline`return [${fn.args.arg}, ...${fn.args.rest}];`)),
      ).resolves.toBe(`(arg, ...rest) => {\n  return [arg, ...rest];\n}\n`);
    });
    it('emits async lambda expression', async () => {
      const fn = new EsCallable({ arg: {}, '...rest': {} });

      await expect(
        esGenerate(
          fn.lambda(fn => esline`return [${fn.args.arg}, ...${fn.args.rest}];`, {
            async: true,
          }),
        ),
      ).resolves.toBe(`async (arg, ...rest) => {\n  return [arg, ...rest];\n}\n`);
    });
  });

  describe('function', () => {
    it('declares anonymous function', async () => {
      const fn = new EsCallable({ arg: {}, '...rest': {} });

      await expect(
        esGenerate(fn.function(fn => esline`return [${fn.args.arg}, ...${fn.args.rest}];`)),
      ).resolves.toBe(`function (arg, ...rest) {\n  return [arg, ...rest];\n}\n`);
    });
    it('emits generator function expression', async () => {
      const fn = new EsCallable({ arg: {}, '...rest': {} });

      await expect(
        esGenerate(
          fn.function(
            fn => code => {
              code.write(esline`yield ${fn.args.arg};`, esline`yield* ${fn.args.rest};`);
            },
            {
              generator: true,
            },
          ),
        ),
      ).resolves.toBe(`function *(arg, ...rest) {\n  yield arg;\n  yield* rest;\n}\n`);
    });
  });
});
