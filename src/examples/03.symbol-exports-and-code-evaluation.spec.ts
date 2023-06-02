import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { EsFunction, esEvaluate, esline } from 'esgen';

describe('Symbol Exports And Code Evaluation', () => {
  let logSpy: jest.SpiedFunction<(...args: unknown[]) => void>;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log');
  });
  afterEach(() => {
    logSpy.mockRestore();
  });

  it('contains valid example', async () => {
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

    // Evaluate emitted code.
    const { print } = (await esEvaluate((_, { ns }) => {
      // Explicitly refer the function to force its emission.
      ns.refer(printFn);
    })) as { print: (text: string) => void };

    print('Hello, World!');

    expect(logSpy).toHaveBeenCalledWith('Hello, World!');
  });
});
