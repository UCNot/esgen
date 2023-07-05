import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { noop } from '@proc7ts/primitives';
import { EsClass, EsField, EsMemberVisibility, EsMethod, esEvaluate, esline } from 'esgen';

describe('Classes', () => {
  let logSpy: jest.SpiedFunction<(...args: unknown[]) => void>;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(noop);
  });
  afterEach(() => {
    logSpy.mockRestore();
  });

  it('contains valid example', async () => {
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

    // Evaluate emitted code.
    const { Printer } = (await esEvaluate((_, { ns }) => {
      // Explicitly refer the class to force its emission.
      ns.refer(printer);
    })) as {
      Printer: new (initialText?: string) => { print(text?: string): void };
    };

    const instance = new Printer();

    instance.print(); // Hello, World!
    instance.print('My text'); // My text.

    expect(logSpy).toHaveBeenNthCalledWith(1, 'Hello, World!');
    expect(logSpy).toHaveBeenNthCalledWith(2, 'My text');
  });
});
