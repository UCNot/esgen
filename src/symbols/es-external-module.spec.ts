import { describe, expect, it } from '@jest/globals';
import { EsExternalModule } from './es-external-module.js';

describe('EsExternalModule', () => {
  it('caches module by name', () => {
    const module = new EsExternalModule('test-module');

    expect(new EsExternalModule(module.moduleName)).toBe(module);
  });

  describe('moduleId', () => {
    it('equals to module name', () => {
      const module = new EsExternalModule('test-module');

      expect(module.moduleId).toBe(module.moduleName);
    });
  });
});
