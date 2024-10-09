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
          .indent(out => out.print())
          .print('}')
          .asText(),
      ).resolves.toBe('{\n\n}\n');
    });
    it('appends new line without indentation instead of empty line', async () => {
      await expect(
        output
          .print('{')
          .indent(out => out.print('').print('').print(''))
          .print('}')
          .asText(),
      ).resolves.toBe('{\n\n}\n');
    });
    it('removes all leading newlines', async () => {
      await expect(
        output.print().print('').print('').print().print().print('text').asText(),
      ).resolves.toBe('\ntext\n');
    });
    it('leaves single newline for empty output', async () => {
      await expect(output.print().print('').print('').print().print().asText()).resolves.toBe('\n');
    });
    it('appends at most one new line', async () => {
      await expect(
        output
          .print('{')
          .indent(out => out.print('abc').print('').print('').print().print('def'))
          .print('}')
          .asText(),
      ).resolves.toBe('{\n  abc\n\n  def\n}\n');
    });
    it('does not append empty output', async () => {
      await expect(output.print('abc', new EsOutput(), 'def').asText()).resolves.toBe('abc\ndef\n');
    });
  });

  describe('line', () => {
    it('joins lines', async () => {
      await expect(
        output
          .print('{')
          .indent(out =>
            out
              .print('{')
              .indent(out => out.line(out => out.print('foo();', 'bar();')))
              .print('}'),
          )
          .print('}')
          .asText(),
      ).resolves.toBe('{\n  {\n    foo();bar();\n  }\n}\n');
    });
  });

  describe('indent inside line', () => {
    it('respects outer indentation', async () => {
      output
        .print('{')
        .indent(out => {
          out.line(out => {
            out
              .print('foo(')
              .indent(out => out.print('a,', 'b,', 'c,', ''))
              .print(');');
          });
        })
        .print('}');

      await expect(output.asText()).resolves.toBe(`{\n  foo(\n    a,\n    b,\n    c,\n  );\n}\n`);
    });
  });

  describe('indent', () => {
    it('indents lines', async () => {
      await expect(
        output
          .print('{')
          .indent(out =>
            out
              .print('{')
              .indent(out => out.print('foo();', 'bar();'), '/* indent */ ')
              .print('}'),
          )
          .print('}')
          .asText(),
      ).resolves.toBe('{\n  {\n  /* indent */ foo();\n  /* indent */ bar();\n  }\n}\n');
    });
  });
});
