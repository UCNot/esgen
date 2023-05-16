import { beforeEach, describe, expect, it } from '@jest/globals';
import { EsBundle } from '../emission/es-bundle.js';
import { esline } from '../esline.tag.js';
import { esLocalFunction } from './es-local.function.js';

describe('EsLocalFunction', () => {
  let bundle: EsBundle;

  beforeEach(() => {
    bundle = new EsBundle();
  });

  describe('declare', () => {
    it('declares local function', async () => {
      const fn = esLocalFunction('test', { arg: {}, '...rest': {} });

      await expect(
        bundle
          .emit(code => {
            code
              .write(fn.declare(fn => esline`return [${fn.args.arg}, ...${fn.args.rest}];`))
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
      const fn = esLocalFunction('test', { arg: {}, '...rest': {} });

      await expect(
        bundle
          .emit(code => {
            code
              .write(
                fn.declare(fn => esline`return [${fn.args.arg}, ...${fn.args.rest}];`, {
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
  });

  describe('declareLambda', () => {
    it('declares const lambda', async () => {
      const fn = esLocalFunction('test', { arg: {}, '...rest': {} });

      await expect(
        bundle
          .emit(code => {
            code
              .write(fn.declareLambda(fn => esline`return [${fn.args.arg}, ...${fn.args.rest}];`))
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
      const fn = esLocalFunction('test', { arg: {}, '...rest': {} });

      await expect(
        bundle
          .emit(code => {
            code
              .write(
                fn.declareLambda(fn => esline`return [${fn.args.arg}, ...${fn.args.rest}];`, {
                  spec: 'let',
                }),
              )
              .write(esline`${fn.call({ arg: '1', rest: ['2', '3'] })};`);
          })
          .asText(),
      ).resolves.toBe(
        `let test = (arg, ...rest) => {\n`
          + `  return [arg, ...rest];\n`
          + `};\n`
          + `test(1, 2, 3);\n`,
      );
    });
  });

  describe('lambda', () => {
    it('emits async lambda expression', async () => {
      const fn = esLocalFunction('test', { arg: {}, '...rest': {} });

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
      const fn = esLocalFunction('test', { arg: {}, '...rest': {} });

      await expect(
        bundle
          .emit(fn.function(fn => esline`return [${fn.args.arg}, ...${fn.args.rest}];`))
          .asText(),
      ).resolves.toBe(`function (arg, ...rest) {\n  return [arg, ...rest];\n}\n`);
    });
    it('emits generator function expression', async () => {
      const fn = esLocalFunction('test', { arg: {}, '...rest': {} });

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
