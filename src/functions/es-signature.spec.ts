import { beforeEach, describe, expect, it } from '@jest/globals';
import { esline } from '../esline.tag.js';
import { EsBundle } from '../scopes/es-bundle.js';
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

  describe('for', () => {
    it('returns new signature instance', () => {
      const signature = EsSignature.for({ arg: {} });

      expect(signature.args.arg.requestedName).toBe('arg');
    });
    it('returns signature instance itself', () => {
      const signature = new EsSignature({});

      expect(EsSignature.for(signature)).toBe(signature);
    });
  });

  describe('declare', () => {
    let bundle: EsBundle;

    beforeEach(() => {
      bundle = new EsBundle();
    });

    it('prints arg with comment inline', async () => {
      const signature = new EsSignature({ test: { comment: 'Test' } });

      await expect(
        bundle.emit(esline`function test${signature.declare()} {}`).asText(),
      ).resolves.toBe(`function test(test /* Test */) {}\n`);
    });
    it('prints multiple args with comments each on new line', async () => {
      const signature = new EsSignature({ arg1: { comment: 'Arg 1' }, arg2: {} });

      await expect(bundle.emit(signature.declare()).asText()).resolves.toBe(
        `(\n  arg1 /* Arg 1 */,\n  arg2,\n)\n`,
      );
    });
    it('prints thee args without comments inline', async () => {
      const signature = new EsSignature({ arg1: {}, arg2: {}, arg3: {} });

      await expect(bundle.emit(signature.declare()).asText()).resolves.toBe(`(arg1, arg2, arg3)\n`);
    });
    it('prints four args without comments each on new line', async () => {
      const signature = new EsSignature({ arg1: {}, arg2: {}, arg3: {}, arg4: {} });

      await expect(bundle.emit(signature.declare()).asText()).resolves.toBe(
        `(\n  arg1,\n  arg2,\n  arg3,\n  arg4,\n)\n`,
      );
    });
    it('prints vararg', async () => {
      const signature = new EsSignature({ '...arg': {} });

      await expect(
        bundle.emit(esline`function test${signature.declare()} {}`).asText(),
      ).resolves.toBe(`function test(...arg) {}\n`);
    });
    it('does not print comma after vararg', async () => {
      const signature = new EsSignature({
        arg: { comment: 'First' },
        '...rest': { comment: 'Rest' },
      });

      await expect(
        bundle.emit(esline`function test${signature.declare()} {}`).asText(),
      ).resolves.toBe(`function test(\n  arg /* First */,\n  ...rest /* Rest */\n) {}\n`);
    });
  });

  describe('acceptsArgsFor', () => {
    it('permits extra arguments', () => {
      const sgn1 = new EsSignature({ arg1: {} });
      const sgn2 = new EsSignature({ arg1: {}, arg2: {} });

      expect(sgn1.acceptsArgsFor(sgn2)).toBe(true);
    });
    it('permits missing optional arguments', () => {
      const sgn1 = new EsSignature({ arg1: {}, 'arg2?': {} });
      const sgn2 = new EsSignature({ arg1: {} });

      expect(sgn1.acceptsArgsFor(sgn2)).toBe(true);
    });
    it('prohibits arguments with different names', () => {
      const sgn1 = new EsSignature({ arg1: {}, test: {} });
      const sgn2 = new EsSignature({ arg1: {}, other: {} });

      expect(sgn1.acceptsArgsFor(sgn2)).toBe(false);
    });
    it('prohibits non-vararg argument in place of vararg', () => {
      const sgn1 = new EsSignature({ arg1: {}, '...rest': {} });
      const sgn2 = new EsSignature({ arg1: {}, rest: {} });

      expect(sgn1.acceptsArgsFor(sgn2)).toBe(false);
    });
    it('prohibits optional argument in place of required', () => {
      const sgn1 = new EsSignature({ arg1: {}, rest: {} });
      const sgn2 = new EsSignature({ arg1: {}, 'rest?': {} });

      expect(sgn1.acceptsArgsFor(sgn2)).toBe(false);
    });
  });

  describe('call', () => {
    let bundle: EsBundle;

    beforeEach(() => {
      bundle = new EsBundle();
    });

    it('prints empty args', async () => {
      const signature = new EsSignature({});

      await expect(bundle.emit(esline`test${signature.call()};`).asText()).resolves.toBe(
        `test();\n`,
      );
    });
    it('prints three args inline', async () => {
      const signature = new EsSignature({ foo: {}, bar: {}, baz: {} });

      await expect(
        bundle.emit(esline`test${signature.call({ foo: '1', baz: '3', bar: '2' })};`).asText(),
      ).resolves.toBe(`test(1, 2, 3);\n`);
    });
    it('prints four args each on new line', async () => {
      const signature = new EsSignature({ arg1: {}, arg2: {}, arg3: {}, arg4: {} });

      await expect(
        bundle.emit(signature.call({ arg1: '1', arg3: '3', arg4: '4', arg2: '2' })).asText(),
      ).resolves.toBe(`(\n  1,\n  2,\n  3,\n  4,\n)\n`);
    });
    it('omits trailing optional args', async () => {
      const signature = new EsSignature({ arg1: {}, arg2: {}, arg3: {}, 'arg4?': {} });

      await expect(
        bundle.emit(signature.call({ arg1: '1', arg3: '3', arg2: '2' })).asText(),
      ).resolves.toBe(`(1, 2, 3)\n`);
    });
    it('substitutes undefined to missing args optional args', async () => {
      const signature = new EsSignature({ arg1: {}, arg2: {}, 'arg3?': {}, 'arg4?': {} });

      await expect(
        bundle.emit(signature.call({ arg1: '1', arg4: '4', arg2: '2' })).asText(),
      ).resolves.toBe(`(\n  1,\n  2,\n  undefined,\n  4,\n)\n`);
    });
    it('substitutes vararg values', async () => {
      const signature = new EsSignature({ 'arg?': {}, '...rest': {} });

      await expect(bundle.emit(signature.call({ rest: ['1', '2'] })).asText()).resolves.toBe(
        `(undefined, 1, 2)\n`,
      );
    });
  });

  describe('Iterable', () => {
    it('iterates over argument symbols', () => {
      const signature = new EsSignature({ arg1: {}, 'arg2?': {} });

      expect([...signature]).toEqual(Object.values(signature.args));
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
