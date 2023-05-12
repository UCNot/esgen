import { beforeEach, describe, expect, it } from '@jest/globals';
import { EsDeclarations } from '../declarations/es-declarations.js';
import { EsCode } from '../es-code.js';
import { EsOutput } from '../es-output.js';
import { EsImports } from '../symbols/es-imports.js';
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

  describe('imports', () => {
    it('constructed by default', () => {
      expect(bundle.imports).toBeInstanceOf(EsImports);
    });
    it('is accepted as initialization option', () => {
      expect(new EsBundle({ imports: bundle => new TestImports(bundle) }).imports).toBeInstanceOf(
        TestImports,
      );
    });
    it('is derived by spawned emission', () => {
      const emission = bundle.spawn();

      expect(emission.imports).toBe(bundle.imports);
    });
  });

  describe('declarations', () => {
    it('constructed by default', () => {
      expect(bundle.declarations).toBeInstanceOf(EsDeclarations);
      expect(bundle.declarations.bundle).toBe(bundle);
    });
    it('is accepted as initialization option', () => {
      expect(
        new EsBundle({ declarations: bundle => new TestDeclarations(bundle) }).declarations,
      ).toBeInstanceOf(TestDeclarations);
    });
    it('is derived by spawned emission', () => {
      const emission = bundle.spawn();

      expect(emission.declarations).toBe(bundle.declarations);
    });
  });

  describe('ns', () => {
    it('is constructed by default', () => {
      expect(bundle.ns.toString()).toBe(`/* Bundle */`);
    });
    it('is accepted as initialization option', () => {
      expect(new EsBundle({ ns: bundle => new TestNamespace(bundle) }).ns).toBeInstanceOf(
        TestNamespace,
      );
    });
    it('is nested within namespace of spawning bundle', () => {
      const emission = bundle.spawn({ ns: { comment: 'Spawned' } });

      expect(emission.ns.toString()).toBe('/* Spawned */');
      expect(bundle.ns.encloses(emission.ns)).toBe(true);
    });
    it('is nested within namespace of spawning emission', () => {
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

      await bundle.done().whenDone();

      expect(bundle.isActive()).toBe(false);
      expect(emission.isActive()).toBe(false);

      await bundle.whenDone();
    });
  });

  describe('span', () => {
    it('prevents emission when done', async () => {
      await bundle.done().whenDone();

      expect(() => bundle.span()).toThrow(new TypeError(`All code emitted already`));

      await bundle.whenDone();
    });
  });

  describe('done', () => {
    it('does nothing on subsequent calls', async () => {
      await bundle.done().done().whenDone();
      await bundle.done().whenDone();

      expect(bundle.isActive()).toBe(false);
    });
    it('completes spawned emission', async () => {
      const spawned = bundle.spawn();

      await bundle.done().whenDone();

      expect(spawned.isActive()).toBe(false);
      expect(bundle.isActive()).toBe(false);

      await bundle.whenDone();
    });
  });

  describe('emit', () => {
    it('emits module', async () => {
      const result = bundle.emit(new EsCode().write(`const a = 'test';`));
      const text = await result.asText();

      expect(text).toBe(`const a = 'test';\n`);
      await expect(new EsOutput().print(result).asText()).resolves.toBe(text);
      await expect(result.asExports()).rejects.toThrow(
        new TypeError(`Can not export from ES2015 bundle`),
      );
    });
    it('emits IIFE code', async () => {
      const bundle = new EsBundle({ format: EsBundleFormat.IIFE });
      const result = bundle.emit(new EsCode().write(`const a = 'test';`));
      const text = await result.asText();

      expect(text).toBe(`(async () => {\n  const a = 'test';\n  return {};\n})()\n`);
      await expect(new EsOutput().print(result).asText()).resolves.toBe(text);
      await expect(result.asExports()).resolves.toEqual({});
    });
  });
});

class TestImports extends EsImports {}

class TestDeclarations extends EsDeclarations {}

class TestNamespace extends EsNamespace {}
