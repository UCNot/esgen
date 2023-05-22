import { describe, expect, it } from '@jest/globals';
import { EsBundle } from 'esgen';

describe('Simple Usage', () => {
  it('contains valid example', async () => {
    const text = await new EsBundle()
      .emit(code => {
        code
          .write(`function print(text) {`)
          .indent(`console.log(text);`)
          .write('}')
          .write(`const greeting = 'Hello, World!';`)
          .write(`print(greeting);`);
      })
      .asText();

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
