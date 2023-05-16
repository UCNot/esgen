import { beforeEach, describe, expect, it } from '@jest/globals';
import { EsNameRegistry } from './es-name-registry.js';

describe('EsNameRegistry', () => {
  let names: EsNameRegistry;

  beforeEach(() => {
    names = new EsNameRegistry();
  });

  describe('reserveName', () => {
    it('uses preferred name by default', () => {
      expect(names.reserveName('test')).toBe('test');
    });
    it('declares "tmp" name by default', () => {
      expect(names.reserveName()).toBe('tmp');
    });
    it('permits duplicate names in nested namespaces', () => {
      expect(names.nest().reserveName('test')).toBe('test');
      expect(names.nest().reserveName('test')).toBe('test');
    });
    it('generates alias for duplicate in nested namespace', () => {
      expect(names.reserveName('test')).toBe('test');
      expect(names.nest().reserveName('test')).toBe('test$0');
      expect(names.nest().reserveName('test')).toBe('test$0');
    });
    it('prevents duplicate of the declared in nested namespace', () => {
      expect(names.nest().reserveName('test')).toBe('test');
      expect(names.reserveName('test')).toBe('test$0');
      expect(names.nest().reserveName('test')).toBe('test');
    });
    it('assigns counter to aliases', () => {
      names.reserveName('test');

      expect(names.reserveName('test')).toBe('test$0');
      expect(names.reserveName('test')).toBe('test$1');
      expect(names.reserveName('test')).toBe('test$2');
    });
    it('assigns counter to aliases with $', () => {
      names.reserveName('test$a');

      expect(names.reserveName('test$a')).toBe('test$a$0');
      expect(names.reserveName('test$a')).toBe('test$a$1');
      expect(names.reserveName('test$a')).toBe('test$a$2');
    });
    it('resolves conflict', () => {
      names.reserveName('test');
      names.reserveName('test$0');

      expect(names.reserveName('test')).toBe('test$1');
      expect(names.reserveName('test$1')).toBe('test$2');
    });
    it('resolves conflict with enclosing namespace', () => {
      const nested = names.nest();

      expect(names.reserveName('test')).toBe('test');
      expect(nested.reserveName('test')).toBe('test$0');
    });
    it('resolves conflict between nested and enclosing namespace', () => {
      const nested = names.nest();

      expect(nested.reserveName('test')).toBe('test');
      expect(names.reserveName('test')).toBe('test$0');
      expect(nested.reserveName('test')).toBe('test$1');
      expect(nested.reserveName('test$0')).toBe('test$2');
      expect(nested.reserveName('test$1')).toBe('test$3');
    });
  });
});
