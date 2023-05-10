import { beforeEach, describe, expect, it } from '@jest/globals';
import { EsBundle } from './es-bundle.js';
import { EsNamespace } from './symbols/es-namespace.js';

describe('EsBundle', () => {
  let bundle: EsBundle;

  beforeEach(() => {
    bundle = new EsBundle();
  });

  describe('bundle', () => {
    it('refers itself', () => {
      expect(bundle.bundle).toBe(bundle);
    });
    it('refers spawning bundle', () => {
      expect(bundle.spawn().spawn().bundle).toBe(bundle);
    });
  });

  describe('ns', () => {
    it('is constructed by default', () => {
      expect(bundle.ns.toString()).toBe(`/* Bundle */`);
    });
    it('is accepted as initialization option', () => {
      const ns = new EsNamespace();

      expect(new EsBundle({ ns }).ns).toBe(ns);
    });
    it('is nested withing namespace of spawning bundle', () => {
      const emission = bundle.spawn({ ns: { comment: 'Spawned' } });

      expect(emission.ns.toString()).toBe('/* Spawned */');
      expect(bundle.ns.encloses(emission.ns)).toBe(true);
    });
    it('is nested withing namespace of spawning emission', () => {
      const emission1 = bundle.spawn();
      const emission2 = emission1.spawn({ ns: { comment: 'Spawned' } });

      expect(emission2.ns.toString()).toBe('/* Spawned */');
      expect(bundle.ns.encloses(emission2.ns)).toBe(true);
      expect(emission1.ns.encloses(emission2.ns)).toBe(true);
    });
  });

  describe('isActive', () => {
    it('returns true by default', () => {
      expect(bundle.isActive()).toBe(true);

      const emission = bundle.spawn();

      expect(emission.isActive()).toBe(true);
    });
    it('returns false when done', async () => {
      const emission = bundle.spawn();
      const whenDone = bundle.done();

      expect(bundle.isActive()).toBe(false);
      expect(emission.isActive()).toBe(false);

      await whenDone;
    });
  });

  describe('emit', () => {
    it('prevents emission when done', async () => {
      const whenDone = bundle.done();

      expect(() => bundle.span()).toThrow(new TypeError(`All code emitted already`));

      await whenDone;
    });
  });

  describe('done', () => {
    it('does nothing on subsequent calls', async () => {
      await bundle.done();
      await bundle.done();
      await bundle.whenDone();

      expect(bundle.isActive()).toBe(false);
    });
    it('completes spawned emission', async () => {
      const spawned = bundle.spawn();
      const whenDone = bundle.done();

      expect(spawned.isActive()).toBe(false);
      expect(bundle.isActive()).toBe(false);

      await whenDone;
    });
  });
});
