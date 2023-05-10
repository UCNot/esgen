import { beforeEach, describe, expect, it } from '@jest/globals';
import { EsCode } from './es-code.js';
import { EsEmission } from './es-emission.js';
import { EsOutput } from './es-output.js';

describe('EsCode', () => {
  let code: EsCode;

  beforeEach(() => {
    code = new EsCode();
  });

  describe('none', () => {
    it('produces no code', async () => {
      await expect(new EsCode().write(EsCode.none).toText()).resolves.toBe('');
    });
  });

  describe('write', () => {
    it('appends new line without indentation', async () => {
      await expect(
        code
          .write('{')
          .indent(code => {
            code.write();
          })
          .write('}')
          .toText(),
      ).resolves.toBe('{\n}\n');
    });
    it('appends at most one new line', async () => {
      await expect(
        code
          .write('{')
          .indent(code => {
            code.write().write('').write();
          })
          .write('}')
          .toText(),
      ).resolves.toBe('{\n\n}\n');
    });
    it('accepts another code fragment', async () => {
      code.write({
        toCode() {
          return code => {
            code.write('foo();');
          };
        },
      });

      await expect(code.toText()).resolves.toBe('foo();\n');
    });
    it('accepts another EsCode instance', async () => {
      code.write(new EsCode().write('foo();'));

      await expect(code.toText()).resolves.toBe('foo();\n');
    });
    it('prevents adding code fragment to itself', async () => {
      code.write(inner => {
        inner.write(code);
      });

      await expect(code.toText()).rejects.toThrow(
        new TypeError('Can not insert code fragment into itself'),
      );
    });
  });

  describe('inline', () => {
    it('joins lines', async () => {
      await expect(
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
          .write('}')
          .toText(),
      ).resolves.toBe('{\n  {\n    foo();bar();\n  }\n}\n');
    });
  });

  describe('indent inside inline', () => {
    it('respects outer indentation', async () => {
      await expect(
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
          .write('};')
          .toText(),
      ).resolves.toBe('const test = {\n  a: {\n    foo: 1,\n    bar: 2,\n  },\n};\n');
    });
  });

  describe('block inside inline', () => {
    it('respects outer indentation only', async () => {
      await expect(
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
          .write('};')
          .toText(),
      ).resolves.toBe('const test = {\n  a: {foo: 1,\n  bar: 2},\n};\n');
    });
  });

  describe('emit', () => {
    it('emits the same code more than once', async () => {
      code.write('first();');

      const emission = new EsEmission();
      const record1 = await code.emit(emission);
      const record2 = await code.emit(emission);

      expect(record1).toBe(record2);

      await expect(new EsOutput().print(record1).toText()).resolves.toBe('first();\n');
      await emission.done();
    });
    it('allows inserting code after call', async () => {
      code.write('first();');

      const emission = new EsEmission();
      const record = await code.emit(emission);

      code.write('second();');

      await expect(new EsOutput().print(record).toText()).resolves.toBe('first();\nsecond();\n');
      await expect(new EsOutput().print(record).toText()).resolves.toBe('first();\nsecond();\n');
      await emission.done();
    });
    it('prevents inserting code after print', async () => {
      code.write('first();');

      const emission = new EsEmission();
      const record = await code.emit(emission);

      await expect(new EsOutput().print(record).toText()).resolves.toBe('first();\n');

      expect(() => code.write('second();')).toThrow(new TypeError('Code printed already'));

      await emission.done();
    });
  });
});
