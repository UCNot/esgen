import { describe, expect, it } from '@jest/globals';
import { esGenerate } from '../es-generate.js';
import { EsBundleFormat } from '../scopes/es-bundle-format.js';
import { EsExternalModule } from './es-external-module.js';
import { esImport } from './es-import.js';

describe('EsImports', () => {
  describe('ES2015', () => {
    it('declares import', async () => {
      await expect(
        esGenerate(code => {
          const test = esImport('test-module', 'test');

          code.line(test, `();`);
        }),
      ).resolves.toBe(`import { test } from 'test-module';\ntest();\n`);
    });
    it('declares import from custom module', async () => {
      const from = new EsExternalModule('test-module');

      await expect(
        esGenerate(code => {
          const test = esImport(from, 'test');

          code.line(test, `();`);
        }),
      ).resolves.toBe(`import { test } from 'test-module';\ntest();\n`);
    });
    it('does not duplicate imports', async () => {
      await expect(
        esGenerate(
          code => {
            const test = esImport('test-module', 'test');

            code.line(test, `(1);`);
          },
          code => {
            const test = esImport('test-module', 'test');

            code.line(test, `(2);`);
          },
        ),
      ).resolves.toBe(`import { test } from 'test-module';\ntest(1);\ntest(2);\n`);
    });
    it('renames imported symbol', async () => {
      await expect(
        esGenerate(code => {
          const test = esImport('test-module', 'test', { as: 'myTest' });

          code.line(test, `();`);
        }),
      ).resolves.toBe(`import { test as myTest } from 'test-module';\nmyTest();\n`);
    });
    it('resolves conflicts', async () => {
      await expect(
        esGenerate(code => {
          const test1 = esImport('test-module1', 'test');
          const test2 = esImport('test-module2', 'test');

          code.line(test1, `(1);`).line(test2, `(2);`);
        }),
      ).resolves.toBe(
        `import { test } from 'test-module1';\n` +
          `import { test as test$0 } from 'test-module2';\n` +
          `test(1);\n` +
          `test$0(2);\n`,
      );
    });
    it('joins imports from the same module', async () => {
      await expect(
        esGenerate(code => {
          const test1 = esImport('test-module', 'test1');
          const test2 = esImport('test-module', 'test2');

          code.line(test1, `();`).line(test2, `();`);
        }),
      ).resolves.toBe(`import {\n  test1,\n  test2,\n} from 'test-module';\ntest1();\ntest2();\n`);
    });
  });

  describe('IIFE', () => {
    it('declares import', async () => {
      await expect(
        esGenerate({ format: EsBundleFormat.IIFE }, code => {
          const test = esImport('test-module', 'test');

          code.line(test, `();`);
        }),
      ).resolves.toBe(
        `(async () => {\n` +
          `  const { test } = await import('test-module');\n` +
          `  test();\n` +
          `})()\n`,
      );
    });
    it('does not duplicate imports', async () => {
      await expect(
        esGenerate(
          { format: EsBundleFormat.IIFE },
          code => {
            const test = esImport('test-module', 'test');

            code.line(test, `(1);`);
          },
          code => {
            const test = esImport('test-module', 'test');

            code.line(test, `(2);`);
          },
        ),
      ).resolves.toBe(
        `(async () => {\n` +
          `  const { test } = await import('test-module');\n` +
          `  test(1);\n` +
          `  test(2);\n` +
          `})()\n`,
      );
    });
    it('renames imported symbol', async () => {
      await expect(
        esGenerate({ format: EsBundleFormat.IIFE }, code => {
          const test = esImport('test-module', 'test', { as: 'myTest' });

          code.line(test, `();`);
        }),
      ).resolves.toBe(
        `(async () => {\n` +
          `  const { test: myTest } = await import('test-module');\n` +
          `  myTest();\n` +
          `})()\n`,
      );
    });
    it('resolves conflicts', async () => {
      await expect(
        esGenerate({ format: EsBundleFormat.IIFE }, code => {
          const test1 = esImport('test-module1', 'test');
          const test2 = esImport('test-module2', 'test');

          code.line(test1, `(1);`).line(test2, `(2);`);
        }),
      ).resolves.toBe(
        `(async () => {\n` +
          `  const { test } = await import('test-module1');\n` +
          `  const { test: test$0 } = await import('test-module2');\n` +
          `  test(1);\n` +
          `  test$0(2);\n` +
          `})()\n`,
      );
    });
    it('joins imports from the same module', async () => {
      await expect(
        esGenerate({ format: EsBundleFormat.IIFE }, code => {
          const test1 = esImport('test-module', 'test1');
          const test2 = esImport('test-module', 'test2');

          code.line(test1, `();`).line(test2, `();`);
        }),
      ).resolves.toBe(
        `(async () => {\n` +
          `  const {\n` +
          `    test1,\n` +
          `    test2,\n` +
          `  } = await import('test-module');\n` +
          `  test1();\n` +
          `  test2();\n` +
          `})()\n`,
      );
    });
  });
});
