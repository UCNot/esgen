# ECMAScript Generator

[![NPM][npm-image]][npm-url]
[![Build Status][build-status-img]][build-status-link]
[![Code Quality][quality-img]][quality-link]
[![Coverage][coverage-img]][coverage-link]
[![GitHub Project][github-image]][github-url]
[![API Documentation][api-docs-image]][api documentation]

Supported features:

- [Pretty-printed] code generation.
- [Naming] conflicts resolution.
- API for generating variables, [functions], [classes], modules, etc.
- Generated [code evaluation].

Choose what you need. If strings concatenation is just enough - that's definitely the way to go.

See [API Documentation] for detailed usage examples.

[npm-image]: https://img.shields.io/npm/v/esgen.svg?logo=npm
[npm-url]: https://www.npmjs.com/package/esgen
[build-status-img]: https://github.com/run-z/esgen/workflows/Build/badge.svg
[build-status-link]: https://github.com/run-z/esgen/actions?query=workflow:Build
[quality-img]: https://app.codacy.com/project/badge/Grade/da92c27a5c3445c58dfa346b1307cb85
[quality-link]: https://app.codacy.com/gh/run-z/esgen/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade
[coverage-img]: https://app.codacy.com/project/badge/Coverage/da92c27a5c3445c58dfa346b1307cb85
[coverage-link]: https://www.codacy.com/gh/run-z/esgen/dashboard?utm_source=github.com&utm_medium=referral&utm_content=run-z/esgen&utm_campaign=Badge_Coverage
[github-image]: https://img.shields.io/static/v1?logo=github&label=GitHub&message=project&color=informational
[github-url]: https://github.com/run-z/esgen
[api-docs-image]: https://img.shields.io/static/v1?logo=typescript&label=API&message=docs&color=informational
[API documentation]: https://run-z.github.io/esgen/
[explanation]: https://github.com/run-z/esgen/blob/master/doc/explanation.md
[URI charge]: https://github.com/run-z/esgen/blob/master/doc/uri-charge-format.md

## Simple Usage

[pretty-printed]: #simple-usage

```typescript
import { EsBundle } from 'esgen';

const result = await new EsBundle()
  .emit(code => {
    code
      .write(`function print(text) {`)
      .indent(`console.log(text);`)
      .write('}')
      .write(`const greeting = 'Hello, World!';`)
      .write(`print(greeting);`);
  })
  .asText();
```

The following code will be emitted:

```javascript
function print(text) {
  console.log(text);
}
const greeting = 'Hello, World!';
print(greeting);
```

## Symbols And Functions

[naming]: #symbols-and-functions
[functions]: #symbols-and-functions

Symbols used to avoid naming conflicts. If the same name requested for two different symbols, one of them will be
automatically renamed.

The example above can utilize symbols:

```typescript
import { EsBundle, EsFunction, EsVarSymbol, esStringLiteral, esline } from 'esgen';

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

const result = await new EsBundle()
  .emit(code => {
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
  })
  .asText();
```

## Symbol Exports And Code Evaluation

[code evaluation]: #symbol-exports-and-code-evaluation

Symbols can be exported from the bundle. In this case it is possible to evaluate emitted code immediately and obtain
the exported symbols.

For example, to export the function `print()` from the example above, the following can be done:

```typescript
import { EsBundle, EsBundleFormat, EsFunction, esline } from 'esgen';

// Create function.
const printFn = new EsFunction(
  'print',
  {
    text: {}, // Require argument called `text`.
  },
  {
    declare: {
      at: 'exports', // Automatically export function once referred.
      body: fn => code => {
        code.write(
          // Place on one line.
          esline`console.log(${fn.args.text /* Refer declared argument symbol */});`,
        );
      },
    },
  },
);

// Create bundle.
const bundle = new EsBundle({
  format: EsBundleFormat.IIFE /* Emit IIFE instead of ESM module */,
});

// Explicitly refer the function to force its emission.
bundle.ns.refer(printFn);

// Evaluate emitted code.
// Only possible for IIFE.
const { print } = (await bundle.emit().asExports()) as { print: (text: string) => void };

print('Hello, World!');
```

## Classes

[classes]: #classes

Classes represented `EsClass` instances.

Class may have a base class, constructor, and members.

```typescript
import { EsBundle, EsBundleFormat, EsClass, EsField, EsMemberVisibility, EsMethod, esline } from 'esgen';

// Declare class
//
// export class Printer { ... }
//
const printer = new EsClass('Printer', {
  classConstructor: {
    args: {
      // Optional argument key ends with `?`.
      'initialText?': {
        comment: 'Default text to print',
      },
    },
  },
  declare: {
    // Export class from the bundle.
    at: 'exports',
  },
});

// Declare private field (without initializer).
//
// #defaultText;
//
const defaultText = new EsField('defaultText', {
  visibility: EsMemberVisibility.Private,
}).declareIn(printer);

// Declare class constructor.
//
// constructor(initialText = 'Hello, World!') {
//   this.#defaultText = initialText;
// }
//
printer.declareConstructor({
  args: {
    initialText: {
      // Assign default value to optional argument.
      declare: naming => esline`${naming} = 'Hello, World!'`,
    },
  },
  body: ({
    member: {
      args: { initialText },
    },
  }) => esline`${defaultText.set('this', initialText)};`,
});

// Declare public method.
//
// print(text = this.#defaultText) {
//   console.log(test);
// }
//
new EsMethod('print', {
  args: { 'text?': { comment: 'Text to print' } },
}).declareIn(printer, {
  args: {
    text: {
      declare: naming => esline`${naming} = ${defaultText.get('this')}`,
    },
  },
  body: ({
    member: {
      args: { text },
    },
  }) => esline`console.log(${text});`,
});

// Create bundle.
const bundle = new EsBundle({
  format: EsBundleFormat.IIFE /* Emit IIFE instead of ESM module */,
});

// Explicitly refer the class to force its emission.
bundle.ns.refer(printer);

// Evaluate emitted code.
const { Printer } = (await bundle.emit().asExports()) as {
  Printer: new (initialText?: string) => { print(text?: string): void };
};

const instance = new Printer();

instance.print(); // Hello, World!
instance.print('My text'); // My text.
```
