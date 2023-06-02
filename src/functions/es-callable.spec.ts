import { beforeEach, describe, expect, it } from '@jest/globals';
import { esline } from '../code/esline.tag.js';
import { EsBundle } from '../scopes/es-bundle.js';
import { EsCallable } from './es-callable.js';

describe('EsCallable', () => {
  let bundle: EsBundle;

  beforeEach(() => {
    bundle = new EsBundle();
  });

  describe('lambda', () => {
    it('emits lambda expression', async () => {
      const fn = new EsCallable({ arg: {}, '...rest': {} });

      await expect(
        bundle.emit(fn.lambda(fn => esline`return [${fn.args.arg}, ...${fn.args.rest}];`)).asText(),
      ).resolves.toBe(`(arg, ...rest) => {\n  return [arg, ...rest];\n}\n`);
    });
    it('emits async lambda expression', async () => {
      const fn = new EsCallable({ arg: {}, '...rest': {} });

      await expect(
        bundle
          .emit(
            fn.lambda(fn => esline`return [${fn.args.arg}, ...${fn.args.rest}];`, {
              async: true,
            }),
          )
          .asText(),
      ).resolves.toBe(`async (arg, ...rest) => {\n  return [arg, ...rest];\n}\n`);
    });
  });

  describe('function', () => {
    it('declares anonymous function', async () => {
      const fn = new EsCallable({ arg: {}, '...rest': {} });

      await expect(
        bundle
          .emit(fn.function(fn => esline`return [${fn.args.arg}, ...${fn.args.rest}];`))
          .asText(),
      ).resolves.toBe(`function (arg, ...rest) {\n  return [arg, ...rest];\n}\n`);
    });
    it('emits generator function expression', async () => {
      const fn = new EsCallable({ arg: {}, '...rest': {} });

      await expect(
        bundle
          .emit(
            fn.function(
              fn => code => {
                code.write(esline`yield ${fn.args.arg};`, esline`yield* ${fn.args.rest};`);
              },
              {
                generator: true,
              },
            ),
          )
          .asText(),
      ).resolves.toBe(`function *(arg, ...rest) {\n  yield arg;\n  yield* rest;\n}\n`);
    });
  });
});
