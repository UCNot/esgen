import { describe, expect, it } from '@jest/globals';
import { asis } from '@proc7ts/primitives';
import { EsCode } from './code/es-code.js';
import { esEvaluate } from './es-evaluate.js';
import { EsEvaluationError } from './es-evaluation.error.js';
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
    it('throws EsEvaluationError', async () => {
      const error = (await esEvaluate('@').catch(asis)) as EsEvaluationError;

      expect(error).toBeInstanceOf(EsEvaluationError);
      expect(error.name).toBe('EsEvaluationError');
      expect(error.message).toBe('Syntax error');
      expect(error.cause).toEqual(new SyntaxError('Invalid or unexpected token'));
      expect(error.isSyntaxError).toBe(true);
      expect(error.evaluatedCode).toBe(
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
      const error = (await esEvaluate(`throw new Error('!!!');`).catch(asis)) as EsEvaluationError;

      expect(error).toBeInstanceOf(EsEvaluationError);
      expect(error.name).toBe('EsEvaluationError');
      expect(error.message).toBe('Evaluation error');
      expect(error.cause).toEqual(new Error('!!!'));
      expect(error.isSyntaxError).toBe(false);
      expect(error.evaluatedCode).toBe(
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
