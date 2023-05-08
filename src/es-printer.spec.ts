import { beforeEach, describe, expect, it } from '@jest/globals';
import { EsPrinter } from './es-printer.js';

describe('EsPrinter', () => {
  let printer: EsPrinter;

  beforeEach(() => {
    printer = new EsPrinter();
  });

  describe('print', () => {
    it('appends new line without indentation', async () => {
      await expect(
        printer
          .print('{')
          .indent(span => span.print())
          .print('}')
          .toText(),
      ).resolves.toBe('{\n\n}\n');
    });
    it('appends new line without indentation instead of empty line', async () => {
      await expect(
        printer
          .print('{')
          .indent(span => span.print('').print('').print(''))
          .print('}')
          .toText(),
      ).resolves.toBe('{\n\n}\n');
    });
    it('removes all leading newlines', async () => {
      await expect(
        printer.print().print('').print('').print().print().print('text').toText(),
      ).resolves.toBe('\ntext\n');
    });
    it('leaves single newline for empty output', async () => {
      await expect(printer.print().print('').print('').print().print().toText()).resolves.toBe(
        '\n',
      );
    });
    it('appends at most one new line', async () => {
      await expect(
        printer
          .print('{')
          .indent(span => span.print('abc').print('').print('').print().print('def'))
          .print('}')
          .toText(),
      ).resolves.toBe('{\n  abc\n\n  def\n}\n');
    });
    it('does not append empty printer', async () => {
      await expect(printer.print('abc', new EsPrinter(), 'def').toText()).resolves.toBe(
        'abc\ndef\n',
      );
    });
  });

  describe('inline', () => {
    it('joins lines', async () => {
      await expect(
        printer
          .print('{')
          .indent(span => span
              .print('{')
              .indent(span => span.inline(span => span.print('foo();', 'bar();')))
              .print('}'))
          .print('}')
          .toText(),
      ).resolves.toBe('{\n  {\n    foo();bar();\n  }\n}\n');
    });
  });

  describe('indent inside inline', () => {
    it('respects outer indentation', async () => {
      printer
        .print('{')
        .indent(span => {
          span.inline(span => {
            span
              .print('foo(')
              .indent(span => span.print('a,', 'b,', 'c,', ''))
              .print(');');
          });
        })
        .print('}');

      await expect(printer.toText()).resolves.toBe(`{\n  foo(\n    a,\n    b,\n    c,\n  );\n}\n`);
    });
  });

  describe('indent', () => {
    it('indents lines', async () => {
      await expect(
        printer
          .print('{')
          .indent(span => span
              .print('{')
              .indent(span => span.print('foo();', 'bar();'), '/* indent */ ')
              .print('}'))
          .print('}')
          .toText(),
      ).resolves.toBe('{\n  {\n  /* indent */ foo();\n  /* indent */ bar();\n  }\n}\n');
    });
  });
});
