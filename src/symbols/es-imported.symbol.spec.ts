import { describe, expect, it } from '@jest/globals';
import { EsExternalModule } from './es-external-module.js';
import { esImport } from './es-import.js';
import { EsImportedSymbol } from './es-imported.symbol.js';

describe('EsImportedSymbol', () => {
  describe('toString', () => {
    it(`reflects module name and requested name`, () => {
      expect(esImport('test-module', 'testSymbol').toString()).toBe(
        `import { testSymbol } from "test-module"`,
      );
    });
    it(`reflects comment`, () => {
      expect(
        new EsImportedSymbol(new EsExternalModule('test-module'), 'testSymbol', {
          comment: 'Test',
        }).toString(),
      ).toBe(`import { testSymbol /* Test */ } from "test-module"`);
    });
  });
});
