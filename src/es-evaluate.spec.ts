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
});
