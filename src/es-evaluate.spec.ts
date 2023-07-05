import { describe, expect, it } from '@jest/globals';
import { EsCode } from './code/es-code.js';
import { esEvaluate } from './es-evaluate.js';
import { EsBundleFormat } from './scopes/es-bundle-format.js';

describe('esEvaluate', () => {
  it('evaluates code', async () => {
    await expect(esEvaluate(new EsCode().write(`const a = 'test';`))).resolves.toBeUndefined();
  });
  it('evaluates IIFE code', async () => {
    await expect(
      esEvaluate({ format: EsBundleFormat.IIFE }, new EsCode().write(`const a = 'test';`)),
    ).resolves.toBeUndefined();
  });

  describe('on syntax error', () => {
    it('throws by default', async () => {
      await expect(esEvaluate('@')).rejects.toThrow(new SyntaxError('Invalid or unexpected token'));
    });
    it('reported to custom handler', async () => {
      let reportedError: unknown;
      let reportedIsSyntaxError: boolean | undefined;
      let reportedText: string | undefined;

      await expect(
        esEvaluate(
          {
            onError(error, text, isSyntaxError) {
              reportedError = error;
              reportedIsSyntaxError = isSyntaxError;
              reportedText = text;

              return false;
            },
          },
          '@',
        ),
      ).resolves.toBe(false);

      expect(reportedError).toEqual(new SyntaxError('Invalid or unexpected token'));
      expect(reportedIsSyntaxError).toBe(true);
      expect(reportedText).toBe(
        `
return (async () => {
  @
})()
;
`.trimStart(),
      );
    });
  });

  describe('on evaluation error', () => {
    it('throws by default', async () => {
      await expect(esEvaluate(`throw new Error('!!!');`)).rejects.toThrow(new Error('!!!'));
    });
    it('reported to custom handler', async () => {
      let reportedError: unknown;
      let reportedIsSyntaxError: boolean | undefined;
      let reportedText: string | undefined;

      await expect(
        esEvaluate(
          {
            onError(error, text, isSyntaxError) {
              reportedError = error;
              reportedIsSyntaxError = isSyntaxError;
              reportedText = text;

              return false;
            },
          },
          `throw new Error('!!!');`,
        ),
      ).resolves.toBe(false);

      expect(reportedError).toEqual(new Error('!!!'));
      expect(reportedIsSyntaxError).toBe(false);
      expect(reportedText).toBe(
        `
return (async () => {
  throw new Error('!!!');
})()
;
`.trimStart(),
      );
    });
  });
});
