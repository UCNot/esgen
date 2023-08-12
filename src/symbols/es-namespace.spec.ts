import { beforeEach, describe, expect, it } from '@jest/globals';
import { asis } from '@proc7ts/primitives';
import { EsBundle } from '../scopes/es-bundle.js';
import { EsNamespace, EsNamingHost } from './es-namespace.js';
import { EsNaming, EsSymbol } from './es-symbol.js';

describe('EsNamespace', () => {
  let bundle: EsBundle;
  let ns: EsNamespace;

  beforeEach(() => {
    bundle = new EsBundle();
    ns = bundle.ns;
  });

  describe('unique symbols', () => {
    describe('addSymbol', () => {
      it('prevents symbol renaming within the same namespace', () => {
        const symbol = new TestSymbol('test');

        expect(symbol.declareIn(ns)).toEqual({
          symbol,
          ns,
          name: 'test',
          emit: expect.any(Function),
        });
        expect(() => symbol.declareIn(ns)).toThrow(
          new TypeError(`Can not rename test /* [Symbol] */ in /* Bundle */`),
        );
      });
      it('prevents symbol renaming in another namespace', () => {
        const nested1 = bundle.nest({ ns: { comment: 'nested 1' } }).ns;
        const nested2 = bundle.nest({ ns: { comment: 'nested 2' } }).ns;
        const symbol = new TestSymbol('test');

        expect(symbol.declareIn(nested1)).toEqual({
          symbol,
          ns: nested1,
          name: 'test',
          emit: expect.any(Function),
        });
        expect(() => symbol.declareIn(nested2)).toThrow(
          new TypeError(
            `Can not assign new name to test /* [Symbol] */ in /* nested 2 */. It is already named in /* nested 1 */`,
          ),
        );
      });
    });

    describe('findSymbol', () => {
      it('returns the named symbol', () => {
        const symbol = new TestSymbol('test');
        const naming = symbol.declareIn(ns);

        expect(ns.findSymbol(symbol)).toBe(naming);
      });
      it('returns the naming of visible symbol', () => {
        const nested = bundle.nest().nest().nest().ns;
        const symbol = new TestSymbol('test');
        const naming = symbol.declareIn(ns);

        expect(nested.findSymbol(symbol)).toBe(naming);
      });
      it('returns none for unnamed symbol', () => {
        expect(ns.findSymbol(new TestSymbol('test'))).toBeUndefined();
      });
      it('returns none for symbol named in nested namespace', () => {
        const nested = bundle.nest().nest().nest().ns;
        const symbol = new TestSymbol('test');

        expect(symbol.declareIn(nested)).toEqual({
          symbol,
          ns: nested,
          name: 'test',
          emit: expect.any(Function),
        });
        expect(ns.findSymbol(symbol)).toBeUndefined();
      });
      it('returns none for invisible symbol', () => {
        const nested1 = bundle.nest().ns;
        const nested2 = bundle.nest().ns;
        const symbol = new TestSymbol('test');

        expect(symbol.declareIn(nested1)).toEqual({
          symbol,
          ns: nested1,
          name: 'test',
          emit: expect.any(Function),
        });
        expect(nested2.findSymbol(symbol)).toBeUndefined();
      });
    });

    describe('refer', () => {
      it('returns symbol naming', () => {
        const symbol = new TestSymbol('test');

        expect(symbol.declareIn(ns).name).toBe('test');
        expect(ns.refer(symbol).getNaming().name).toBe('test');
      });
      it('returns visible symbol naming', () => {
        const nested = bundle.nest().nest().nest().ns;
        const symbol = new TestSymbol('test');

        expect(symbol.declareIn(ns).name).toBe('test');
        expect(nested.refer(symbol).getNaming().name).toBe('test');
      });

      describe('getNaming', () => {
        it('throws for unnamed symbol', () => {
          const symbol = new TestSymbol('test', { comment: 'Test symbol' });

          expect(() => ns.refer(symbol).getNaming()).toThrow(
            new ReferenceError(`test /* [Symbol] Test symbol */ is unnamed`),
          );
        });
        it('throws for invisible symbol', () => {
          const nested1 = bundle.nest({ ns: { comment: 'nested 1' } }).ns;
          const nested2 = bundle.nest({ ns: { comment: 'nested 2' } }).ns;
          const symbol = new TestSymbol('test');

          expect(symbol.declareIn(nested1).name).toBe('test');
          expect(() => nested2.refer(symbol).getNaming()).toThrow(
            new ReferenceError(
              `${symbol} is invisible to /* nested 2 */. It is named in /* nested 1 */`,
            ),
          );
        });
      });

      describe('whenNamed', () => {
        it('rejects on unnamed symbol', async () => {
          const symbol = new TestSymbol('test', { comment: 'Test symbol' });

          await expect(ns.refer(symbol).whenNamed()).rejects.toThrow(
            new ReferenceError(`test /* [Symbol] Test symbol */ is unnamed`),
          );
        });
        it('resolves on symbol named immediately after reference', async () => {
          const symbol = new TestSymbol('test', { comment: 'Test symbol' });
          const whenNamed = ns.refer(symbol).whenNamed();

          symbol.declareIn(ns);

          await expect(whenNamed).resolves.toEqual({
            symbol,
            ns,
            name: 'test',
            emit: expect.any(Function),
          });
        });
        it('resolves on symbol named after delay', async () => {
          const symbol = new TestSymbol('test', { comment: 'Test symbol' });
          const whenNamed = ns.refer(symbol).whenNamed();

          await Promise.resolve();
          await Promise.resolve();
          await Promise.resolve();
          symbol.declareIn(ns);

          await expect(whenNamed).resolves.toEqual({
            symbol,
            ns,
            name: 'test',
            emit: expect.any(Function),
          });
        });
        it('rejects on invisible symbol', async () => {
          const nested1 = bundle.nest({ ns: { comment: 'nested 1' } }).ns;
          const nested2 = bundle.nest({ ns: { comment: 'nested 2' } }).ns;
          const symbol = new TestSymbol('test');

          expect(symbol.declareIn(nested1).name).toBe('test');
          await expect(() => nested2.refer(symbol).whenNamed()).rejects.toThrow(
            new ReferenceError(
              `${symbol} is invisible to /* nested 2 */. It is named in /* nested 1 */`,
            ),
          );
        });
      });
    });
  });

  describe('non-unique symbols', () => {
    describe('addSymbol', () => {
      it('names the symbol in unrelated namespace', () => {
        const nested1 = bundle.nest({ ns: { comment: 'nested 1' } }).ns;
        const nested2 = bundle.nest({ ns: { comment: 'nested 2' } }).ns;
        const symbol = new TestSymbol('test', { unique: false });

        expect(symbol.declareIn(nested1)).toEqual({
          symbol,
          ns: nested1,
          name: 'test',
          emit: expect.any(Function),
        });
        expect(symbol.declareIn(nested2)).toEqual({
          symbol,
          ns: nested2,
          name: 'test',
          emit: expect.any(Function),
        });
      });
      it('prevents symbol renaming within the same namespace', () => {
        const symbol = new TestSymbol('test', { unique: false });

        expect(symbol.declareIn(ns)).toEqual({
          symbol,
          ns,
          name: 'test',
          emit: expect.any(Function),
        });
        expect(() => symbol.declareIn(ns)).toThrow(
          new TypeError(`Can not rename test /* [Symbol] */ in /* Bundle */`),
        );
      });
      it('prevents symbol renaming in nested namespace', () => {
        const nested = bundle.nest({ ns: { comment: 'nested' } }).ns;
        const symbol = new TestSymbol('test', { unique: false });

        expect(symbol.declareIn(ns)).toEqual({
          symbol,
          ns: nested,
          name: 'test',
          emit: expect.any(Function),
        });
        expect(() => symbol.declareIn(nested)).toThrow(
          new TypeError(
            `Can not assign new name to test /* [Symbol] */ in /* nested */. It is already named in /* Bundle */`,
          ),
        );
      });
      it('prevents symbol renaming in enclosing namespace', () => {
        const nested = bundle.nest({ ns: { comment: 'nested' } }).ns;
        const symbol = new TestSymbol('test', { unique: false });

        expect(symbol.declareIn(nested)).toEqual({
          symbol,
          ns: nested,
          name: 'test',
          emit: expect.any(Function),
        });
        expect(() => symbol.declareIn(ns)).toThrow(
          new TypeError(
            `Can not assign new name to test /* [Symbol] */ in /* Bundle */. It is already named in /* nested */`,
          ),
        );
      });
    });

    describe('findSymbol', () => {
      it('returns the named symbol', () => {
        const symbol = new TestSymbol('test', { unique: false });
        const naming = symbol.declareIn(ns);

        expect(ns.findSymbol(symbol)).toBe(naming);
      });
      it('returns the naming of visible symbol', () => {
        const nested = bundle.nest().nest().nest().ns;
        const symbol = new TestSymbol('test', { unique: false });
        const naming = symbol.declareIn(ns);

        expect(nested.findSymbol(symbol)).toBe(naming);
      });
      it('returns none for unnamed symbol', () => {
        expect(ns.findSymbol(new TestSymbol('test', { unique: false }))).toBeUndefined();
      });
      it('returns none for symbol named in nested namespace', () => {
        const nested = bundle.nest().nest().nest().ns;
        const symbol = new TestSymbol('test');

        expect(symbol.declareIn(nested)).toEqual({
          symbol,
          ns: nested,
          name: 'test',
          emit: expect.any(Function),
        });
        expect(ns.findSymbol(symbol)).toBeUndefined();
      });
      it('returns none for invisible symbol', () => {
        const nested1 = bundle.nest().ns;
        const nested2 = bundle.nest().ns;
        const symbol = new TestSymbol('test', { unique: false });

        expect(symbol.declareIn(nested1)).toEqual({
          symbol,
          ns: nested1,
          name: 'test',
          emit: expect.any(Function),
        });
        expect(nested2.findSymbol(symbol)).toBeUndefined();
      });
    });

    describe('refer', () => {
      it('returns symbol naming', () => {
        const symbol = new TestSymbol('test', { unique: false });

        expect(symbol.declareIn(ns).name).toBe('test');
        expect(ns.refer(symbol).getNaming().name).toBe('test');
      });
      it('returns visible symbol naming', () => {
        const nested = bundle.nest().nest().nest().ns;
        const symbol = new TestSymbol('test', { unique: false });

        expect(symbol.declareIn(ns).name).toBe('test');
        expect(nested.refer(symbol).getNaming().name).toBe('test');
      });

      describe('getNaming', () => {
        it('throws for unnamed symbol', () => {
          const symbol = new TestSymbol('test', { unique: false, comment: 'Test symbol' });

          expect(() => ns.refer(symbol).getNaming()).toThrow(
            new ReferenceError(`test /* [Symbol] Test symbol */ is unnamed`),
          );
        });
        it('throws for invisible symbol', () => {
          const nested1 = bundle.nest({ ns: { comment: 'nested 1' } }).ns;
          const nested2 = bundle.nest({ ns: { comment: 'nested 2' } }).ns;
          const symbol = new TestSymbol('test', { unique: false });

          expect(symbol.declareIn(nested1).name).toBe('test');
          expect(() => nested2.refer(symbol).getNaming()).toThrow(
            new ReferenceError(
              `${symbol} is invisible to /* nested 2 */. It is named in /* nested 1 */`,
            ),
          );
        });
        it('refers proper symbol', () => {
          const nested1 = bundle.nest({ ns: { comment: 'nested 1' } }).ns;
          const nested2 = bundle.nest({ ns: { comment: 'nested 2' } }).ns;
          const symbol = new TestSymbol('test', { unique: false });

          expect(symbol.declareIn(nested1).name).toBe('test');
          expect(symbol.declareIn(nested2).name).toBe('test');
          expect(nested1.refer(symbol).getNaming().name).toBe('test');
          expect(nested1.refer(symbol).getNaming().ns).toBe(nested1);
          expect(nested2.refer(symbol).getNaming().name).toBe('test');
          expect(nested2.refer(symbol).getNaming().ns).toBe(nested2);
        });
      });
    });
  });
});

class TestSymbol extends EsSymbol {

  declareIn({ ns }: EsNamingHost): EsNaming {
    return ns.addSymbol(this, asis);
  }

}
