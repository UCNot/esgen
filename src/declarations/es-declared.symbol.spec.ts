import { describe, expect, it } from '@jest/globals';
import { EsDeclaredSymbol } from './es-declared.symbol.js';

describe('EsDeclaredSymbol', () => {
  describe('toString', () => {
    it(`reflects requested name`, () => {
      const symbol = new EsDeclaredSymbol('testSymbol', {
        declare: ({ naming: { name } }) => `const ${name} = 13;`,
      });

      expect(symbol.toString()).toBe(`testSymbol /* [Declared] */`);
    });
    it(`reflects comment`, () => {
      const symbol = new EsDeclaredSymbol('testSymbol', {
        declare: ({ naming: { name } }) => `const ${name} = 13;`,
        comment: 'Test',
      });

      expect(symbol.toString()).toBe(`testSymbol /* [Declared] Test */`);
    });
  });
});
