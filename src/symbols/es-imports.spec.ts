import { beforeEach, describe, expect, it } from '@jest/globals';
import { EsBundleFormat } from '../emission/es-bundle-format.js';
import { EsBundle } from '../emission/es-bundle.js';
import { esImport } from './es-import.js';

describe('EsImports', () => {
  describe('ES2015', () => {
    let bundle: EsBundle;

    beforeEach(() => {
      bundle = new EsBundle();
    });

    it('declares import', async () => {
      await expect(
        bundle
          .emit(code => {
            const test = esImport('test-module', 'test');

            code.inline(test, `();`);
          })
          .asText(),
      ).resolves.toBe(`import { test } from 'test-module';\ntest();\n`);
    });
    it('does not duplicate imports', async () => {
      await expect(
        bundle
          .emit(
            code => {
              const test = esImport('test-module', 'test');

              code.inline(test, `(1);`);
            },
            code => {
              const test = esImport('test-module', 'test');

              code.inline(test, `(2);`);
            },
          )
          .asText(),
      ).resolves.toBe(`import { test } from 'test-module';\ntest(1);\ntest(2);\n`);
    });
    it('resolves conflicts', async () => {
      await expect(
        bundle
          .emit(code => {
            const test1 = esImport('test-module1', 'test');
            const test2 = esImport('test-module2', 'test');

            code.inline(test1, `(1);`).inline(test2, `(2);`);
          })
          .asText(),
      ).resolves.toBe(
        `import { test } from 'test-module1';\n`
          + `import { test as test$0 } from 'test-module2';\n`
          + `test(1);\n`
          + `test$0(2);\n`,
      );
    });
    it('joins imports from the same module', async () => {
      await expect(
        bundle
          .emit(code => {
            const test1 = esImport('test-module', 'test1');
            const test2 = esImport('test-module', 'test2');

            code.inline(test1, `();`).inline(test2, `();`);
          })
          .asText(),
      ).resolves.toBe(`import {\n  test1,\n  test2,\n} from 'test-module';\ntest1();\ntest2();\n`);
    });
  });

  describe('IIFE', () => {
    let bundle: EsBundle;

    beforeEach(() => {
      bundle = new EsBundle({ format: EsBundleFormat.IIFE });
    });

    it('declares import', async () => {
      await expect(
        bundle
          .emit(code => {
            const test = esImport('test-module', 'test');

            code.inline(test, `();`);
          })
          .asText(),
      ).resolves.toBe(
        `(async () => {\n`
          + `  const { test } = await import('test-module');\n`
          + `  test();\n`
          + `  return {};\n`
          + `})()\n`,
      );
    });
    it('does not duplicate imports', async () => {
      await expect(
        bundle
          .emit(
            code => {
              const test = esImport('test-module', 'test');

              code.inline(test, `(1);`);
            },
            code => {
              const test = esImport('test-module', 'test');

              code.inline(test, `(2);`);
            },
          )
          .asText(),
      ).resolves.toBe(
        `(async () => {\n`
          + `  const { test } = await import('test-module');\n`
          + `  test(1);\n`
          + `  test(2);\n`
          + `  return {};\n`
          + `})()\n`,
      );
    });
    it('resolves conflicts', async () => {
      await expect(
        bundle
          .emit(code => {
            const test1 = esImport('test-module1', 'test');
            const test2 = esImport('test-module2', 'test');

            code.inline(test1, `(1);`).inline(test2, `(2);`);
          })
          .asText(),
      ).resolves.toBe(
        `(async () => {\n`
          + `  const { test } = await import('test-module1');\n`
          + `  const { test: test$0 } = await import('test-module2');\n`
          + `  test(1);\n`
          + `  test$0(2);\n`
          + `  return {};\n`
          + `})()\n`,
      );
    });
    it('joins imports from the same module', async () => {
      await expect(
        bundle
          .emit(code => {
            const test1 = esImport('test-module', 'test1');
            const test2 = esImport('test-module', 'test2');

            code.inline(test1, `();`).inline(test2, `();`);
          })
          .asText(),
      ).resolves.toBe(
        `(async () => {\n`
          + `  const {\n`
          + `    test1,\n`
          + `    test2,\n`
          + `  } = await import('test-module');\n`
          + `  test1();\n`
          + `  test2();\n`
          + `  return {};\n`
          + `})()\n`,
      );
    });
  });
});
