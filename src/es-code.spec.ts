import { beforeEach, describe, expect, it } from '@jest/globals';
import { EsBundle } from './emission/es-bundle.js';
import { EsCode } from './es-code.js';
import { EsOutput } from './es-output.js';

describe('EsCode', () => {
  let code: EsCode;

  beforeEach(() => {
    code = new EsCode();
  });

  describe('none', () => {
    it('produces no code', async () => {
      code.write(EsCode.none);

      await expect(new EsBundle().emit(code).asText()).resolves.toBe('');
    });
  });

  describe('write', () => {
    it('appends new line without indentation', async () => {
      code
        .write('{')
        .indent(code => {
          code.write();
        })
        .write('}');

      await expect(new EsBundle().emit(code).asText()).resolves.toBe('{\n}\n');
    });
    it('appends at most one new line', async () => {
      code
        .write('{')
        .indent(code => {
          code.write().write('').write();
        })
        .write('}');

      await expect(new EsBundle().emit(code).asText()).resolves.toBe('{\n\n}\n');
    });
    it('accepts another code fragment', async () => {
      code.write({
        toCode() {
          return code => {
            code.write('foo();');
          };
        },
      });

      await expect(new EsBundle().emit(code).asText()).resolves.toBe('foo();\n');
    });
    it('accepts another EsCode instance', async () => {
      code.write(new EsCode().write('foo();'));

      await expect(new EsBundle().emit(code).asText()).resolves.toBe('foo();\n');
    });
    it('prevents adding code fragment to itself', async () => {
      code.write(inner => {
        inner.write(code);
      });

      await expect(new EsBundle().emit(code).asText()).rejects.toThrow(
        new TypeError(`Can not insert code fragment into itself`),
      );
    });
  });

  describe('inline', () => {
    it('joins lines', async () => {
      code
        .write('{')
        .indent(code => {
          code
            .write('{')
            .indent(code => {
              code.inline(code => {
                code.write('foo();', 'bar();');
              });
            })
            .write('}');
        })
        .write('}');

      await expect(new EsBundle().emit(code).asText()).resolves.toBe(
        '{\n  {\n    foo();bar();\n  }\n}\n',
      );
    });
  });

  describe('indent inside inline', () => {
    it('respects outer indentation', async () => {
      code
        .write('const test = {')
        .indent(code => {
          code.inline(
            'a: ',
            '{',
            code => {
              code.indent('foo: 1,', 'bar: 2,', '');
            },
            '},',
          );
        })
        .write('};');

      await expect(new EsBundle().emit(code).asText()).resolves.toBe(
        'const test = {\n  a: {\n    foo: 1,\n    bar: 2,\n  },\n};\n',
      );
    });
  });

  describe('block inside inline', () => {
    it('respects outer indentation only', async () => {
      code
        .write('const test = {')
        .indent(code => {
          code.inline(
            'a: ',
            '{',
            code => {
              code.block('foo: 1,', 'bar: 2');
            },
            '},',
          );
        })
        .write('};');

      await expect(new EsBundle().emit(code).asText()).resolves.toBe(
        'const test = {\n  a: {foo: 1,\n  bar: 2},\n};\n',
      );
    });
  });

  describe('emit', () => {
    it('emits the same code more than once', async () => {
      code.write('first();');

      const bundle = new EsBundle();
      const record1 = code.emit(bundle);
      const record2 = code.emit(bundle);

      expect(record1).toBe(record2);

      await expect(new EsOutput().print(record1).asText()).resolves.toBe('first();\n');

      await bundle.done().whenDone();
    });
    it('allows inserting code after call', async () => {
      code.write('first();');

      const bundle = new EsBundle();
      const emission = bundle.spawn();
      const printer = code.emit(emission);

      code.write('second();');

      await expect(new EsOutput().print(printer).asText()).resolves.toBe('first();\nsecond();\n');
      await expect(new EsOutput().print(printer).asText()).resolves.toBe('first();\nsecond();\n');

      bundle.done();
      await emission.whenDone();
    });
    it('prevents inserting code after print', async () => {
      code.write('first();');

      const bundle = new EsBundle();
      const printer = code.emit(bundle);

      await expect(new EsOutput().print(printer).asText()).resolves.toBe('first();\n');

      expect(() => code.write('second();')).toThrow(new TypeError('Code printed already'));

      await bundle.done().whenDone();
    });
  });
});
