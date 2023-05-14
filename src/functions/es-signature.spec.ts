import { beforeEach, describe, expect, it } from '@jest/globals';
import { EsBundle } from '../emission/es-bundle.js';
import { EsArgKind } from './es-arg.symbol.js';
import { EsSignature } from './es-signature.js';

describe('EsSignature', () => {
  it('reorders optional and rest args', () => {
    const signature = new EsSignature({ '...rest': {}, 'second?': {}, first: {} });
    const { args, vararg } = signature;

    expect(Object.keys(args)).toEqual(['first', 'second', 'rest']);

    const { first, second, rest } = args;

    expect(first.position).toBe(0);
    expect(first.kind).toBe(EsArgKind.Required);
    expect(first.signature).toBe(signature);

    expect(second.position).toBe(1);
    expect(second.kind).toBe(EsArgKind.Optional);
    expect(second.signature).toBe(signature);

    expect(rest.position).toBe(2);
    expect(rest.kind).toBe(EsArgKind.VarArg);
    expect(vararg).toBe(rest);
    expect(rest.signature).toBe(signature);
  });
  it('prohibits duplicate arg names', () => {
    expect(() => new EsSignature({ 'test?': {}, test: {} })).toThrow('Duplicate arg: "test"');
    expect(() => new EsSignature({ test: {}, '...test': {} })).toThrow('Duplicate arg: "test"');
  });
  it('prohibits more than one vararg', () => {
    expect(() => new EsSignature({ '...rest1': {}, '...rest2': {} })).toThrow(
      new TypeError(`Duplicate vararg: "rest2"`),
    );
  });

  describe('declare', () => {
    let bundle: EsBundle;

    beforeEach(() => {
      bundle = new EsBundle();
    });

    it('prints arg with comment inline', async () => {
      const args = new EsSignature({ test: { comment: 'Test' } });

      await expect(bundle.emit(args.declare()).asText()).resolves.toBe(`(test /* Test */)\n`);
    });
    it('prints multiple args with comments each on new line', async () => {
      const args = new EsSignature({ arg1: { comment: 'Arg 1' }, arg2: {} });

      await expect(bundle.emit(args.declare()).asText()).resolves.toBe(
        `(\n  arg1 /* Arg 1 */,\n  arg2,\n)\n`,
      );
    });
    it('prints thee args without comments inline', async () => {
      const args = new EsSignature({ arg1: {}, arg2: {}, arg3: {} });

      await expect(bundle.emit(args.declare()).asText()).resolves.toBe(`(arg1, arg2, arg3)\n`);
    });
    it('prints four args without comments each on new line', async () => {
      const args = new EsSignature({ arg1: {}, arg2: {}, arg3: {}, arg4: {} });

      await expect(bundle.emit(args.declare()).asText()).resolves.toBe(
        `(\n  arg1,\n  arg2,\n  arg3,\n  arg4,\n)\n`,
      );
    });
    it('prints vararg', async () => {
      const args = new EsSignature({ '...arg': {} });

      await expect(bundle.emit(args.declare()).asText()).resolves.toBe(`(...arg)\n`);
    });
    it('does not print comma after vararg', async () => {
      const args = new EsSignature({ arg: { comment: 'First' }, '...rest': { comment: 'Rest' } });

      await expect(bundle.emit(args.declare()).asText()).resolves.toBe(
        `(\n  arg /* First */,\n  ...rest /* Rest */\n)\n`,
      );
    });
  });

  describe('toString', () => {
    it('reflects arguments', () => {
      const signature = new EsSignature({
        arg1: { comment: 'Required' },
        'arg2?': { comment: 'Optional' },
        '...rest': {},
      });

      expect(signature.toString()).toBe(`(arg1 /* Required */, arg2? /* Optional */, ...rest)`);
    });
  });
});
