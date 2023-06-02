import { describe, expect, it } from '@jest/globals';
import { esGenerate } from '../es-generate.js';
import { esImport } from '../symbols/es-import.js';
import { esline } from './esline.tag.js';

describe('esline', () => {
  it('emits a line of code', async () => {
    const test = esImport('test-module', 'test');

    await expect(esGenerate(esline`console.log(${test});`)).resolves.toBe(
      `import { test } from 'test-module';\nconsole.log(test);\n`,
    );
  });
});
