import { beforeEach, describe, expect, it } from '@jest/globals';
import { jsStringLiteral } from 'httongue';
import { esGenerate } from '../es-generate.js';
import { EsBundle } from '../scopes/es-bundle.js';
import { EsCode } from './es-code.js';
import { EsOutput } from './es-output.js';

describe('EsCode', () => {
  let code: EsCode;

  beforeEach(() => {
    code = new EsCode();
  });

  describe('none', () => {
    it('emits no code', async () => {
      code.write(EsCode.none);

      await expect(esGenerate(code)).resolves.toBe('');
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

      await expect(esGenerate(code)).resolves.toBe('{\n}\n');
    });
    it('appends at most one new line', async () => {
      code
        .write('{')
        .indent(code => {
          code.write().write('').write();
        })
        .write('}');

      await expect(esGenerate(code)).resolves.toBe('{\n\n}\n');
    });
    it('accepts another code fragment', async () => {
      code.write(new EsCode().write('foo();'));

      await expect(esGenerate(code)).resolves.toBe('foo();\n');
    });
    it('prevents adding code fragment to itself', async () => {
      code.write(inner => {
        inner.write(code);
      });

      await expect(esGenerate(code)).rejects.toThrow(
        new TypeError(`Can not insert code fragment into itself`),
      );
    });
  });

  describe('line', () => {
    it('joins fragments', async () => {
      code
        .write('{')
        .indent(code => {
          code
            .write('{')
            .indent(code => {
              code.line(code => {
                code.write('foo();', 'bar();');
              });
            })
            .write('}');
        })
        .write('}');

      await expect(esGenerate(code)).resolves.toBe('{\n  {\n    foo();bar();\n  }\n}\n');
    });
  });

  describe('indent inside line of code', () => {
    it('respects outer indentation', async () => {
      code
        .write('const test = {')
        .indent(code => {
          code.line(
            'a: ',
            '{',
            code => {
              code.indent('foo: 1,', 'bar: 2,', '');
            },
            '},',
          );
        })
        .write('};');

      await expect(esGenerate(code)).resolves.toBe(
        'const test = {\n  a: {\n    foo: 1,\n    bar: 2,\n  },\n};\n',
      );
    });
  });

  describe('multi-line inside line of code', () => {
    it('respects outer indentation only', async () => {
      code
        .write('const test = {')
        .indent(code => {
          code.line(
            'a: ',
            '{',
            code => {
              code.multiLine('foo: 1,', 'bar: 2');
            },
            '},',
          );
        })
        .write('};');

      await expect(esGenerate(code)).resolves.toBe(
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
      const scope = bundle.nest();
      const printer = code.emit(scope);

      code.write('second();');

      await expect(new EsOutput().print(printer).asText()).resolves.toBe('first();\nsecond();\n');
      await expect(new EsOutput().print(printer).asText()).resolves.toBe('first();\nsecond();\n');

      bundle.done();
      await scope.whenDone();
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

  describe('scope', () => {
    it('starts code emission within nested scope', async () => {
      await expect(
        esGenerate(code => {
          code.scope((code, { kind }) => {
            code.write(`const scopeKind = ${jsStringLiteral(kind)};`);
          });
        }),
      ).resolves.toBe(`const scopeKind = 'block';\n`);
    });
  });
});
