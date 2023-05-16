import { describe, expect, it } from '@jest/globals';
import { EsSignature } from './es-signature.js';

describe('EsArgSymbol', () => {
  describe('toString', () => {
    it('reflects argument position', () => {
      const signature = new EsSignature({ foo: {}, bar: {}, baz: {} });

      expect(signature.args.bar.toString()).toBe('bar /* [Arg #1] */');
    });
  });
});
