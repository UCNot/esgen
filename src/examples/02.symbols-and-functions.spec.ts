import { describe, expect, it } from '@jest/globals';
import { EsFunction, EsVarSymbol, esGenerate, esStringLiteral, esline } from 'esgen';

describe('Symbols And Functions', () => {
  it('contains valid example', async () => {
    // Create function.
    const print = new EsFunction(
      'print',
      {
        text: {}, // Require argument called `text`.
      },
      {
        declare: {
          at: 'bundle', // Automatically declare function at top level once referred.
          body: fn => code => {
            code.write(
              // Place on one line.
              esline`console.log(${fn.args.text /* Refer declared argument symbol */});`,
            );
          },
        },
      },
    );

    const text = await esGenerate(code => {
      // Create variable symbol.
      const greeting = new EsVarSymbol('greeting');

      code
        .write(
          // Declare variable explicitly.
          greeting.declare({
            // Initialize it with string literal.
            value: () => esStringLiteral('Hello, World!'),
          }),
        )
        .write(
          // Call `print()` function.
          esline`${print.call({
            text: greeting /* Pass variable as argument. */,
          })};`,
        );
    });

    expect(text).toBe(
      `
function print(text) {
  console.log(text);
}
const greeting = 'Hello, World!';
print(greeting);
`.trimStart(),
    );
  });
});
