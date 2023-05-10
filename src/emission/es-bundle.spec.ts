import { beforeEach, describe, expect, it } from '@jest/globals';
import { EsCode } from '../es-code.js';
import { EsOutput } from '../es-output.js';
import { EsNamespace } from '../symbols/es-namespace.js';
import { EsBundleFormat } from './es-bundle-format.js';
import { EsBundle } from './es-bundle.js';

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

  describe('format', () => {
    it('is ES2015 by default', () => {
      expect(bundle.format).toBe(EsBundleFormat.ES2015);
      expect(bundle.spawn().format).toBe(EsBundleFormat.ES2015);
    });
    it('is accepted as initialization option', () => {
      const format = EsBundleFormat.IIFE;
      const bundle = new EsBundle({ format });

      expect(bundle.format).toBe(format);
      expect(bundle.spawn().format).toBe(format);
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

  describe('span', () => {
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

  describe('emit', () => {
    it('emits module', async () => {
      const result = bundle.emit(new EsCode().write(`const a = 'test';`));
      const text = await result.toText();

      expect(text).toBe(`const a = 'test';\n`);
      await expect(new EsOutput().print(result).toText()).resolves.toBe(text);
      await expect(result.toExports()).rejects.toThrow(
        new TypeError(`Can not export from ES2015 bundle`),
      );
    });
    it('emits IIFE code', async () => {
      const bundle = new EsBundle({ format: EsBundleFormat.IIFE });
      const result = bundle.emit(new EsCode().write(`const a = 'test';`));
      const text = await result.toText();

      expect(text).toBe(`return (async () => {\n  const a = 'test';\n  return {};\n})();\n`);
      await expect(new EsOutput().print(result).toText()).resolves.toBe(text);
      await expect(result.toExports()).resolves.toEqual({});
    });
  });
});
