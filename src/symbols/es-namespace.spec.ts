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

  describe('reserveName', () => {
    it('uses preferred name by default', () => {
      expect(ns.reserveName('test')).toBe('test');
    });
    it('declares "tmp" name by default', () => {
      expect(ns.reserveName()).toBe('tmp');
    });
    it('permits duplicate names in nested namespaces', () => {
      expect(bundle.spawn().ns.reserveName('test')).toBe('test');
      expect(bundle.spawn().ns.reserveName('test')).toBe('test');
    });
    it('generates alias for duplicate in nested namespace', () => {
      expect(ns.reserveName('test')).toBe('test');
      expect(bundle.spawn().ns.reserveName('test')).toBe('test$0');
      expect(bundle.spawn().ns.reserveName('test')).toBe('test$0');
    });
    it('prevents duplicate of the declared in nested namespace', () => {
      expect(bundle.spawn().ns.reserveName('test')).toBe('test');
      expect(ns.reserveName('test')).toBe('test$0');
      expect(bundle.spawn().ns.reserveName('test')).toBe('test');
    });
    it('assigns counter to aliases', () => {
      ns.reserveName('test');

      expect(ns.reserveName('test')).toBe('test$0');
      expect(ns.reserveName('test')).toBe('test$1');
      expect(ns.reserveName('test')).toBe('test$2');
    });
    it('assigns counter to aliases with $', () => {
      ns.reserveName('test$a');

      expect(ns.reserveName('test$a')).toBe('test$a$0');
      expect(ns.reserveName('test$a')).toBe('test$a$1');
      expect(ns.reserveName('test$a')).toBe('test$a$2');
    });
    it('resolves conflict', () => {
      ns.reserveName('test');
      ns.reserveName('test$0');

      expect(ns.reserveName('test')).toBe('test$1');
      expect(ns.reserveName('test$1')).toBe('test$2');
    });
    it('resolves conflict with enclosing namespace', () => {
      const nested = bundle.spawn().ns;

      expect(ns.reserveName('test')).toBe('test');
      expect(nested.reserveName('test')).toBe('test$0');
    });
    it('resolves conflict between nested and enclosing namespace', () => {
      const nested = bundle.spawn().ns;

      expect(nested.reserveName('test')).toBe('test');
      expect(ns.reserveName('test')).toBe('test$0');
      expect(nested.reserveName('test')).toBe('test$1');
      expect(nested.reserveName('test$0')).toBe('test$2');
      expect(nested.reserveName('test$1')).toBe('test$3');
    });
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
          toCode: expect.any(Function),
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
          toCode: expect.any(Function),
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
          toCode: expect.any(Function),
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
          toCode: expect.any(Function),
        });
        expect(nested2.findSymbol(symbol)).toBeUndefined();
      });
    });

    describe('refer', () => {
      it('returns symbol naming', () => {
        const symbol = new UniqueSymbol('test');

        expect(ns.nameSymbol(symbol).name).toBe('test');
        expect(ns.refer(symbol).name).toBe('test');
      });
      it('returns visible symbol naming', () => {
        const nested = bundle.spawn().spawn().spawn().ns;
        const symbol = new UniqueSymbol('test');

        expect(ns.nameSymbol(symbol).name).toBe('test');
        expect(nested.refer(symbol).name).toBe('test');
      });
      it('throws for unnamed symbol', () => {
        expect(() => ns.refer(new UniqueSymbol('test', { comment: 'Test symbol' }))).toThrow(
          new ReferenceError(`test /* [Symbol] Test symbol */ is unnamed`),
        );
      });
      it('throws for invisible symbol', () => {
        const nested1 = bundle.spawn({ ns: { comment: 'nested 1' } }).ns;
        const nested2 = bundle.spawn({ ns: { comment: 'nested 2' } }).ns;
        const symbol = new UniqueSymbol('test');

        expect(nested1.nameSymbol(symbol).name).toBe('test');
        expect(() => nested2.refer(symbol)).toThrow(
          new ReferenceError(
            `${symbol} is invisible to /* nested 2 */. It is named in /* nested 1 */`,
          ),
        );
      });
    });
  });

  describe('non-unique symbols', () => {
    describe('nameSymbol', () => {
      it('returns the naming of the symbol within the same namespace', () => {
        const symbol = new NonUniqueSymbol('test');
        const naming = ns.nameSymbol(symbol);

        expect(naming).toEqual({ symbol, ns, name: 'test', toCode: expect.any(Function) });
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
          toCode: expect.any(Function),
        });
        expect(nested2.nameSymbol(symbol)).toEqual({
          symbol,
          ns: nested2,
          name: 'test',
          toCode: expect.any(Function),
        });
      });
      it('prevents symbol renaming in nested namespace', () => {
        const nested = bundle.spawn({ ns: { comment: 'nested' } }).ns;
        const symbol = new NonUniqueSymbol('test');

        expect(ns.nameSymbol(symbol)).toEqual({
          symbol,
          ns: nested,
          name: 'test',
          toCode: expect.any(Function),
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
          toCode: expect.any(Function),
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
          toCode: expect.any(Function),
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
          toCode: expect.any(Function),
        });
        expect(nested2.findSymbol(symbol)).toBeUndefined();
      });
    });

    describe('refer', () => {
      it('returns symbol naming', () => {
        const symbol = new NonUniqueSymbol('test');

        expect(ns.nameSymbol(symbol).name).toBe('test');
        expect(ns.refer(symbol).name).toBe('test');
      });
      it('returns visible symbol naming', () => {
        const nested = bundle.spawn().spawn().spawn().ns;
        const symbol = new NonUniqueSymbol('test');

        expect(ns.nameSymbol(symbol).name).toBe('test');
        expect(nested.refer(symbol).name).toBe('test');
      });
      it('throws for unnamed symbol', () => {
        const symbol = new NonUniqueSymbol('test', { comment: 'Test symbol' });

        expect(() => ns.refer(symbol)).toThrow(
          new ReferenceError(`test /* [Symbol] Test symbol */ is unnamed`),
        );
      });
      it('throws for invisible symbol', () => {
        const nested1 = bundle.spawn({ ns: { comment: 'nested 1' } }).ns;
        const nested2 = bundle.spawn({ ns: { comment: 'nested 2' } }).ns;
        const symbol = new NonUniqueSymbol('test');

        expect(nested1.nameSymbol(symbol).name).toBe('test');
        expect(() => nested2.refer(symbol)).toThrow(
          new ReferenceError(
            `${symbol} is invisible to /* nested 2 */. It is named in /* nested 1 */`,
          ),
        );
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
