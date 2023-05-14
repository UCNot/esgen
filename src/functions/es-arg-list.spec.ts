import { beforeEach, describe, expect, it } from '@jest/globals';
import { EsBundle } from '../emission/es-bundle.js';
import { EsArgList } from './es-arg-list.js';

describe('EsArgList', () => {
  let bundle: EsBundle;

  beforeEach(() => {
    bundle = new EsBundle();
  });

  describe('declare', () => {
    it('prints arg with comment inline', async () => {
      const args = new EsArgList({ test: { comment: 'Test' } });

      await expect(bundle.emit(args.declare()).asText()).resolves.toBe(`(test /* Test */)\n`);
    });
    it('prints multiple args with comments each on new line', async () => {
      const args = new EsArgList({ arg1: { comment: 'Arg 1' }, arg2: {} });

      await expect(bundle.emit(args.declare()).asText()).resolves.toBe(
        `(\n  arg1 /* Arg 1 */,\n  arg2,\n)\n`,
      );
    });
    it('prints thee args without comments inline', async () => {
      const args = new EsArgList({ arg1: {}, arg2: {}, arg3: {} });

      await expect(bundle.emit(args.declare()).asText()).resolves.toBe(`(arg1, arg2, arg3)\n`);
    });
    it('prints four args without comments each on new line', async () => {
      const args = new EsArgList({ arg1: {}, arg2: {}, arg3: {}, arg4: {} });

      await expect(bundle.emit(args.declare()).asText()).resolves.toBe(
        `(\n  arg1,\n  arg2,\n  arg3,\n  arg4,\n)\n`,
      );
    });
    it('prints vararg', async () => {
      const args = new EsArgList({ '...arg': {} });

      await expect(bundle.emit(args.declare()).asText()).resolves.toBe(`(...arg)\n`);
    });
    it('does not print comma after vararg', async () => {
      const args = new EsArgList({ arg: { comment: 'First' }, '...rest': { comment: 'Rest' } });

      await expect(bundle.emit(args.declare()).asText()).resolves.toBe(
        `(\n  arg /* First */,\n  ...rest /* Rest */\n)\n`,
      );
    });
  });
});
