import { describe, expect, it } from '@jest/globals';
import { EsExternalModule } from './es-external-module.js';
import { esImport } from './es-import.js';
import { EsImportSymbol } from './es-import.symbol.js';

describe('EsImportSymbol', () => {
  describe('toString', () => {
    it(`reflects module name and requested name`, () => {
      expect(esImport('test-module', 'testSymbol').toString()).toBe(
        `testSymbol /* [from "test-module"] */`,
      );
    });
    it(`reflects comment`, () => {
      expect(
        new EsImportSymbol(new EsExternalModule('test-module'), 'testSymbol', {
          comment: 'Test',
        }).toString(),
      ).toBe(`testSymbol /* [from "test-module"] Test */`);
    });
  });
});
