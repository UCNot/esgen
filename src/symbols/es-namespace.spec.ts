import { beforeEach, describe, expect, it } from '@jest/globals';
import { EsNamespace } from './es-namespace.js';
import { EsSymbol } from './es-symbol.js';

describe('EsNamespace', () => {
  let ns: EsNamespace;

  beforeEach(() => {
    ns = new EsNamespace();
  });

  describe('name', () => {
    it('uses preferred name by default', () => {
      expect(ns.name('test')).toBe('test');
    });
    it('declares "tmp" name by default', () => {
      expect(ns.name()).toBe('tmp');
    });
    it('permits duplicate names in nested namespaces', () => {
      expect(ns.nest().name('test')).toBe('test');
      expect(ns.nest().name('test')).toBe('test');
    });
    it('generates alias for duplicate in nested namespace', () => {
      expect(ns.name('test')).toBe('test');
      expect(ns.nest().name('test')).toBe('test$0');
      expect(ns.nest().name('test')).toBe('test$0');
    });
    it('prevents duplicate of the declared in nested namespace', () => {
      expect(ns.nest().name('test')).toBe('test');
      expect(ns.name('test')).toBe('test$0');
      expect(ns.nest().name('test')).toBe('test');
    });
    it('assigns counter to aliases', () => {
      ns.name('test');

      expect(ns.name('test')).toBe('test$0');
      expect(ns.name('test')).toBe('test$1');
      expect(ns.name('test')).toBe('test$2');
    });
    it('assigns counter to aliases with $', () => {
      ns.name('test$a');

      expect(ns.name('test$a')).toBe('test$a$0');
      expect(ns.name('test$a')).toBe('test$a$1');
      expect(ns.name('test$a')).toBe('test$a$2');
    });
    it('resolves conflict', () => {
      ns.name('test');
      ns.name('test$0');

      expect(ns.name('test')).toBe('test$1');
      expect(ns.name('test$1')).toBe('test$2');
    });
    it('resolves conflict with enclosing namespace', () => {
      const nested = ns.nest();

      expect(ns.name('test')).toBe('test');
      expect(nested.name('test')).toBe('test$0');
    });
    it('resolves conflict between nested and enclosing namespace', () => {
      const nested = ns.nest();

      expect(nested.name('test')).toBe('test');
      expect(ns.name('test')).toBe('test$0');
      expect(nested.name('test')).toBe('test$1');
      expect(nested.name('test$0')).toBe('test$2');
      expect(nested.name('test$1')).toBe('test$3');
    });
  });

  describe('bindSymbol', () => {
    it('returns the binding of the symbol bound to the same namespace', () => {
      const symbol = new EsSymbol('test');

      expect(ns.bindSymbol(symbol)).toBe('test');
      expect(ns.bindSymbol(symbol)).toBe('test');
    });
    it('prevents symbol re-binding', () => {
      const nested1 = ns.nest({ comment: 'nested 1' });
      const nested2 = ns.nest({ comment: 'nested 2' });
      const symbol = new EsSymbol('test');

      expect(nested1.bindSymbol(symbol)).toBe('test');
      expect(() => nested2.bindSymbol(symbol)).toThrow(
        new TypeError(
          `Can not bind Symbol "test" to /* nested 2 */. It is already bound to /* nested 1 */`,
        ),
      );
    });
  });

  describe('findSymbol', () => {
    it('returns the bound symbol', () => {
      const symbol = new EsSymbol('test');

      expect(ns.bindSymbol(symbol)).toBe('test');
      expect(ns.findSymbol(symbol)).toEqual({ ns, name: 'test' });
    });
    it('returns the binding of visible symbol', () => {
      const nested = ns.nest().nest().nest();
      const symbol = new EsSymbol('test');

      expect(ns.bindSymbol(symbol)).toBe('test');
      expect(nested.findSymbol(symbol)).toEqual({ ns, name: 'test' });
    });
    it('returns none for unbound symbol', () => {
      expect(ns.findSymbol(new EsSymbol('test'))).toBeUndefined();
    });
    it('returns none for symbol bound in nested namespace', () => {
      const nested = ns.nest().nest().nest();
      const symbol = new EsSymbol('test');

      expect(nested.bindSymbol(symbol)).toBe('test');
      expect(ns.findSymbol(symbol)).toBeUndefined();
    });
    it('returns none for invisible symbol', () => {
      const nested1 = ns.nest();
      const nested2 = ns.nest();
      const symbol = new EsSymbol('test');

      expect(nested1.bindSymbol(symbol)).toBe('test');
      expect(nested2.findSymbol(symbol)).toBeUndefined();
    });
  });

  describe('symbolName', () => {
    it('returns the name of the bound symbol', () => {
      const symbol = new EsSymbol('test');

      expect(ns.bindSymbol(symbol)).toBe('test');
      expect(ns.symbolName(symbol)).toBe('test');
    });
    it('returns the name of visible symbol', () => {
      const nested = ns.nest().nest().nest();
      const symbol = new EsSymbol('test');

      expect(ns.bindSymbol(symbol)).toBe('test');
      expect(nested.symbolName(symbol)).toBe('test');
    });
    it('throws for unbound symbol', () => {
      expect(() => ns.symbolName(new EsSymbol('test', { comment: 'Test symbol' }))).toThrow(
        new ReferenceError(`Symbol "test" /* Test symbol */ is unbound`),
      );
    });
    it('throws for invisible symbol', () => {
      const nested1 = ns.nest({ comment: 'nested 1' });
      const nested2 = ns.nest({ comment: 'nested 2' });
      const symbol = new EsSymbol('test');

      expect(nested1.bindSymbol(symbol)).toBe('test');
      expect(() => nested2.symbolName(symbol)).toThrow(
        new ReferenceError(
          `${symbol} is not visible within /* nested 2 */. It is bound to /* nested 1 */`,
        ),
      );
    });
  });
});
