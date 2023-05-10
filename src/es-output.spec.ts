import { beforeEach, describe, expect, it } from '@jest/globals';
import { EsOutput } from './es-output.js';

describe('EsOutput', () => {
  let output: EsOutput;

  beforeEach(() => {
    output = new EsOutput();
  });

  describe('print', () => {
    it('appends new line without indentation', async () => {
      await expect(
        output
          .print('{')
          .indent(span => span.print())
          .print('}')
          .toText(),
      ).resolves.toBe('{\n\n}\n');
    });
    it('appends new line without indentation instead of empty line', async () => {
      await expect(
        output
          .print('{')
          .indent(span => span.print('').print('').print(''))
          .print('}')
          .toText(),
      ).resolves.toBe('{\n\n}\n');
    });
    it('removes all leading newlines', async () => {
      await expect(
        output.print().print('').print('').print().print().print('text').toText(),
      ).resolves.toBe('\ntext\n');
    });
    it('leaves single newline for empty output', async () => {
      await expect(output.print().print('').print('').print().print().toText()).resolves.toBe('\n');
    });
    it('appends at most one new line', async () => {
      await expect(
        output
          .print('{')
          .indent(span => span.print('abc').print('').print('').print().print('def'))
          .print('}')
          .toText(),
      ).resolves.toBe('{\n  abc\n\n  def\n}\n');
    });
    it('does not append empty output', async () => {
      await expect(output.print('abc', new EsOutput(), 'def').toText()).resolves.toBe('abc\ndef\n');
    });
  });

  describe('inline', () => {
    it('joins lines', async () => {
      await expect(
        output
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
      output
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

      await expect(output.toText()).resolves.toBe(`{\n  foo(\n    a,\n    b,\n    c,\n  );\n}\n`);
    });
  });

  describe('indent', () => {
    it('indents lines', async () => {
      await expect(
        output
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
