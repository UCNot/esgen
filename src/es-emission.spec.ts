import { beforeEach, describe, expect, it } from '@jest/globals';
import { EsEmission } from './es-emission.js';

describe('EsEmission', () => {
  let emission: EsEmission;

  beforeEach(() => {
    emission = new EsEmission();
  });

  describe('isActive', () => {
    it('returns true by default', () => {
      expect(emission.isActive()).toBe(true);
    });
    it('returns false when done', async () => {
      const whenDone = emission.done();

      expect(emission.isActive()).toBe(false);

      await whenDone;
    });
  });

  describe('emit', () => {
    it('prevents emission when done', async () => {
      const whenDone = emission.done();

      expect(() => emission.emit()).toThrow(new TypeError(`All code emitted already`));

      await whenDone;
    });
  });

  describe('done', () => {
    it('does nothing on subsequent calls', async () => {
      await emission.done();
      await emission.done();
      await emission.whenDone();

      expect(emission.isActive()).toBe(false);
    });
    it('has no effect on nested emission', async () => {
      const nested = new EsEmission(emission);
      const whenDone = nested.done();

      expect(nested.isActive()).toBe(true);
      expect(emission.isActive()).toBe(true);

      await whenDone;
    });
    it('completes nested emission', async () => {
      const nested = new EsEmission(emission);
      const whenDone = emission.done();

      expect(nested.isActive()).toBe(false);
      expect(emission.isActive()).toBe(false);

      await whenDone;
    });
  });
});
