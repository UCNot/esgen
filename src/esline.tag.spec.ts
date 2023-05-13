import { beforeEach, describe, expect, it } from '@jest/globals';
import { EsBundle } from './emission/es-bundle.js';
import { esline } from './esline.tag.js';
import { esImport } from './symbols/es-import.js';

describe('esline', () => {
  let bundle: EsBundle;

  beforeEach(() => {
    bundle = new EsBundle();
  });

  it('emits inline code', async () => {
    const test = esImport('test-module', 'test');

    await expect(bundle.emit(esline`console.log(${test});`).asText()).resolves.toBe(
      `import { test } from 'test-module';\nconsole.log(test);\n`,
    );
  });
});
