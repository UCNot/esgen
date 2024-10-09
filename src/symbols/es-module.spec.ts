import { describe, expect, it } from '@jest/globals';
import { EsModule } from './es-module.js';

describe('EsModule', () => {
  describe('moduleId', () => {
    it('is the module instance', () => {
      const module = new TestModule('test-module');

      expect(module.moduleId).toBe(module);
    });
  });

  describe('toString', () => {
    it('reflects module name', () => {
      const module = new TestModule('test-module');

      expect(module.toString()).toBe('Module "test-module"');
    });
  });
});

class TestModule extends EsModule {
  readonly #moduleName: string;

  constructor(moduleName: string) {
    super();
    this.#moduleName = moduleName;
  }

  override get moduleName(): string {
    return this.#moduleName;
  }
}
