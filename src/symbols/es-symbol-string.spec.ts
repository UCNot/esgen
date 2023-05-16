import { describe, expect, it } from '@jest/globals';
import { esSymbolString } from './es-symbol-string.js';

describe('esSymbolString', () => {
  it('returns symbol name by default', () => {
    expect(esSymbolString('test')).toBe('test');
  });
});
