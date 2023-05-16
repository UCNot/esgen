import { beforeEach, describe, expect, it } from '@jest/globals';
import { EsBundle } from '../emission/es-bundle.js';
import { EsNamespace } from './es-namespace.js';
import { EsNaming, EsSymbol } from './es-symbol.js';

describe('EsNamespace', () => {
  let bundle: EsBundle;
  let ns: EsNamespace;

  beforeEach(() => {
    bundle = new EsBundle();
    ns = bundle.ns;
  });

  describe('unique symbols', () => {
    describe('nameSymbol', () => {
      it('returns the naming of the symbol within the same namespace', () => {
        const symbol = new UniqueSymbol('test');
        const naming = ns.nameSymbol(symbol);

        expect(naming).toEqual({
          symbol,
          ns,
          name: 'test',
          emit: expect.any(Function),
        });
        expect(ns.nameSymbol(symbol)).toBe(naming);
      });
      it('prevents symbol renaming', () => {
        const nested1 = bundle.spawn({ ns: { comment: 'nested 1' } }).ns;
        const nested2 = bundle.spawn({ ns: { comment: 'nested 2' } }).ns;
        const symbol = new UniqueSymbol('test');

        expect(nested1.nameSymbol(symbol)).toEqual({
          symbol,
          ns: nested1,
          name: 'test',
          emit: expect.any(Function),
        });
        expect(() => nested2.nameSymbol(symbol)).toThrow(
          new TypeError(
            `Can not assign new name to test /* [Symbol] */ in /* nested 2 */. It is already named in /* nested 1 */`,
          ),
        );
      });
    });

    describe('findSymbol', () => {
      it('returns the named symbol', () => {
        const symbol = new UniqueSymbol('test');
        const naming = ns.nameSymbol(symbol);

        expect(ns.findSymbol(symbol)).toBe(naming);
      });
      it('returns the naming of visible symbol', () => {
        const nested = bundle.spawn().spawn().spawn().ns;
        const symbol = new UniqueSymbol('test');
        const naming = ns.nameSymbol(symbol);

        expect(nested.findSymbol(symbol)).toBe(naming);
      });
      it('returns none for unnamed symbol', () => {
        expect(ns.findSymbol(new UniqueSymbol('test'))).toBeUndefined();
      });
      it('returns none for symbol named in nested namespace', () => {
        const nested = bundle.spawn().spawn().spawn().ns;
        const symbol = new UniqueSymbol('test');

        expect(nested.nameSymbol(symbol)).toEqual({
          symbol,
          ns: nested,
          name: 'test',
          emit: expect.any(Function),
        });
        expect(ns.findSymbol(symbol)).toBeUndefined();
      });
      it('returns none for invisible symbol', () => {
        const nested1 = bundle.spawn().ns;
        const nested2 = bundle.spawn().ns;
        const symbol = new UniqueSymbol('test');

        expect(nested1.nameSymbol(symbol)).toEqual({
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
        const symbol = new UniqueSymbol('test');

        expect(ns.nameSymbol(symbol).name).toBe('test');
        expect(ns.refer(symbol).getNaming().name).toBe('test');
      });
      it('returns visible symbol naming', () => {
        const nested = bundle.spawn().spawn().spawn().ns;
        const symbol = new UniqueSymbol('test');

        expect(ns.nameSymbol(symbol).name).toBe('test');
        expect(nested.refer(symbol).getNaming().name).toBe('test');
      });

      describe('getNaming', () => {
        it('throws for unnamed symbol', () => {
          const symbol = new UniqueSymbol('test', { comment: 'Test symbol' });

          expect(() => ns.refer(symbol).getNaming()).toThrow(
            new ReferenceError(`test /* [Symbol] Test symbol */ is unnamed`),
          );
        });
        it('throws for invisible symbol', () => {
          const nested1 = bundle.spawn({ ns: { comment: 'nested 1' } }).ns;
          const nested2 = bundle.spawn({ ns: { comment: 'nested 2' } }).ns;
          const symbol = new UniqueSymbol('test');

          expect(nested1.nameSymbol(symbol).name).toBe('test');
          expect(() => nested2.refer(symbol).getNaming()).toThrow(
            new ReferenceError(
              `${symbol} is invisible to /* nested 2 */. It is named in /* nested 1 */`,
            ),
          );
        });
      });

      describe('whenNamed', () => {
        it('rejects on unnamed symbol', async () => {
          const symbol = new UniqueSymbol('test', { comment: 'Test symbol' });

          await expect(ns.refer(symbol).whenNamed()).rejects.toThrow(
            new ReferenceError(`test /* [Symbol] Test symbol */ is unnamed`),
          );
        });
        it('resolves on symbol named immediately after reference', async () => {
          const symbol = new UniqueSymbol('test', { comment: 'Test symbol' });
          const whenNamed = ns.refer(symbol).whenNamed();

          ns.nameSymbol(symbol);

          await expect(whenNamed).resolves.toEqual({
            symbol,
            ns,
            name: 'test',
            emit: expect.any(Function),
          });
        });
        it('resolves on symbol named after delay', async () => {
          const symbol = new UniqueSymbol('test', { comment: 'Test symbol' });
          const whenNamed = ns.refer(symbol).whenNamed();

          await Promise.resolve();
          await Promise.resolve();
          await Promise.resolve();
          ns.nameSymbol(symbol);

          await expect(whenNamed).resolves.toEqual({
            symbol,
            ns,
            name: 'test',
            emit: expect.any(Function),
          });
        });
        it('rejects on invisible symbol', async () => {
          const nested1 = bundle.spawn({ ns: { comment: 'nested 1' } }).ns;
          const nested2 = bundle.spawn({ ns: { comment: 'nested 2' } }).ns;
          const symbol = new UniqueSymbol('test');

          expect(nested1.nameSymbol(symbol).name).toBe('test');
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
    describe('nameSymbol', () => {
      it('returns the naming of the symbol within the same namespace', () => {
        const symbol = new NonUniqueSymbol('test');
        const naming = ns.nameSymbol(symbol);

        expect(naming).toEqual({ symbol, ns, name: 'test', emit: expect.any(Function) });
        expect(ns.nameSymbol(symbol)).toBe(naming);
      });
      it('names the symbol in unrelated namespace', () => {
        const nested1 = bundle.spawn({ ns: { comment: 'nested 1' } }).ns;
        const nested2 = bundle.spawn({ ns: { comment: 'nested 2' } }).ns;
        const symbol = new NonUniqueSymbol('test');

        expect(nested1.nameSymbol(symbol)).toEqual({
          symbol,
          ns: nested1,
          name: 'test',
          emit: expect.any(Function),
        });
        expect(nested2.nameSymbol(symbol)).toEqual({
          symbol,
          ns: nested2,
          name: 'test',
          emit: expect.any(Function),
        });
      });
      it('prevents symbol renaming in nested namespace', () => {
        const nested = bundle.spawn({ ns: { comment: 'nested' } }).ns;
        const symbol = new NonUniqueSymbol('test');

        expect(ns.nameSymbol(symbol)).toEqual({
          symbol,
          ns: nested,
          name: 'test',
          emit: expect.any(Function),
        });
        expect(() => nested.nameSymbol(symbol)).toThrow(
          new TypeError(
            `Can not assign new name to test /* [Symbol] */ in /* nested */. It is already named in /* Bundle */`,
          ),
        );
      });
      it('prevents symbol renaming in enclosing namespace', () => {
        const nested = bundle.spawn({ ns: { comment: 'nested' } }).ns;
        const symbol = new NonUniqueSymbol('test');

        expect(nested.nameSymbol(symbol)).toEqual({
          symbol,
          ns: nested,
          name: 'test',
          emit: expect.any(Function),
        });
        expect(() => ns.nameSymbol(symbol)).toThrow(
          new TypeError(
            `Can not assign new name to test /* [Symbol] */ in /* Bundle */. It is already named in /* nested */`,
          ),
        );
      });
    });

    describe('findSymbol', () => {
      it('returns the named symbol', () => {
        const symbol = new NonUniqueSymbol('test');
        const naming = ns.nameSymbol(symbol);

        expect(ns.findSymbol(symbol)).toBe(naming);
      });
      it('returns the naming of visible symbol', () => {
        const nested = bundle.spawn().spawn().spawn().ns;
        const symbol = new NonUniqueSymbol('test');
        const naming = ns.nameSymbol(symbol);

        expect(nested.findSymbol(symbol)).toBe(naming);
      });
      it('returns none for unnamed symbol', () => {
        expect(ns.findSymbol(new NonUniqueSymbol('test'))).toBeUndefined();
      });
      it('returns none for symbol named in nested namespace', () => {
        const nested = bundle.spawn().spawn().spawn().ns;
        const symbol = new UniqueSymbol('test');

        expect(nested.nameSymbol(symbol)).toEqual({
          symbol,
          ns: nested,
          name: 'test',
          emit: expect.any(Function),
        });
        expect(ns.findSymbol(symbol)).toBeUndefined();
      });
      it('returns none for invisible symbol', () => {
        const nested1 = bundle.spawn().ns;
        const nested2 = bundle.spawn().ns;
        const symbol = new NonUniqueSymbol('test');

        expect(nested1.nameSymbol(symbol)).toEqual({
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
        const symbol = new NonUniqueSymbol('test');

        expect(ns.nameSymbol(symbol).name).toBe('test');
        expect(ns.refer(symbol).getNaming().name).toBe('test');
      });
      it('returns visible symbol naming', () => {
        const nested = bundle.spawn().spawn().spawn().ns;
        const symbol = new NonUniqueSymbol('test');

        expect(ns.nameSymbol(symbol).name).toBe('test');
        expect(nested.refer(symbol).getNaming().name).toBe('test');
      });

      describe('getNaming', () => {
        it('throws for unnamed symbol', () => {
          const symbol = new NonUniqueSymbol('test', { comment: 'Test symbol' });

          expect(() => ns.refer(symbol).getNaming()).toThrow(
            new ReferenceError(`test /* [Symbol] Test symbol */ is unnamed`),
          );
        });
        it('throws for invisible symbol', () => {
          const nested1 = bundle.spawn({ ns: { comment: 'nested 1' } }).ns;
          const nested2 = bundle.spawn({ ns: { comment: 'nested 2' } }).ns;
          const symbol = new NonUniqueSymbol('test');

          expect(nested1.nameSymbol(symbol).name).toBe('test');
          expect(() => nested2.refer(symbol).getNaming()).toThrow(
            new ReferenceError(
              `${symbol} is invisible to /* nested 2 */. It is named in /* nested 1 */`,
            ),
          );
        });
      });
    });
  });
});

class UniqueSymbol extends EsSymbol {

  override bind(naming: EsNaming): EsNaming {
    return naming;
  }

}

class NonUniqueSymbol extends EsSymbol {

  override isUnique(): boolean {
    return false;
  }

  override bind(naming: EsNaming): EsNaming {
    return naming;
  }

}
