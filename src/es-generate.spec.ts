import { describe, expect, it } from '@jest/globals';
import { EsCode } from './code/es-code.js';
import { esGenerate } from './es-generate.js';
import { EsBundleFormat } from './scopes/es-bundle-format.js';

describe('esGenerate', () => {
  it('generates module', async () => {
    const text = await esGenerate(new EsCode().write(`const a = 'test';`));

    expect(text).toBe(`const a = 'test';\n`);
  });
  it('generated IIFE code', async () => {
    const text = await esGenerate(
      { format: EsBundleFormat.IIFE },
      new EsCode().write(`const a = 'test';`),
    );

    expect(text).toBe(`(async () => {\n  const a = 'test';\n})()\n`);
  });
});
