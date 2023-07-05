import { EsOutput } from './code/es-output.js';
import { EsSnippet } from './code/es-snippet.js';
import { generateEsCode, prepareEsGeneration } from './es-generate.impl.js';
import { EsGenerationOptions } from './es-generate.js';
import { EsBundleFormat } from './scopes/es-bundle-format.js';

/**
 * Generates code and evaluates it.
 *
 * @param options - Code evaluation options.
 * @param snippets - Evaluated code snippets.
 *
 * @returns Promise resolved to module exports.
 */
export function esEvaluate(
  options: EsEvaluationOptions,
  ...snippets: EsSnippet[]
): Promise<unknown>;

/**
 * Generates {@link EsBundleFormat.IIFE IIFE} code and evaluates it.
 *
 * @param snippets - Evaluated code snippets.
 *
 * @returns Promise resolved to module exports.
 */
export function esEvaluate(...snippets: EsSnippet[]): Promise<unknown>;

export async function esEvaluate(
  ...args: [EsEvaluationOptions, ...EsSnippet[]] | EsSnippet[]
): Promise<unknown> {
  const [options, snippets] = prepareEsGeneration<EsEvaluationOptions>(
    { format: EsBundleFormat.IIFE },
    ...args,
  );
  const { onError = onEsEvaluationError } = options;
  const iife = await generateEsCode(options, snippets);
  const text = await new EsOutput().line(out => out.print('return ', iife, ';')).asText();
  let factory: () => Promise<unknown>;

  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    factory = new Function(text) as () => Promise<unknown>;
  } catch (error) {
    return onError(error, text, true);
  }

  try {
    return await factory();
  } catch (error) {
    return onError(error, text, false);
  }
}

/**
 * Options for code {@link esEvaluate evaluation}.
 */
export interface EsEvaluationOptions extends EsGenerationOptions {
  /**
   * Evaluated code format.
   *
   * The only supported value is {@link EsBundleFormat.IIFE IIFE}.
   */
  readonly format?: EsBundleFormat.IIFE | undefined;

  /**
   * Function to call on evaluation failure.
   *
   * @param error - Error thrown.
   * @param text - Evaluated source code.
   * @param isSyntaxError - Whether the error throw is a syntax error. `false` on error thrown during evaluation.
   *
   * @returns Evaluation result to return on error.
   *
   * @defaultValue Re-throws the `error`.
   */
  readonly onError?:
    | ((this: void, error: unknown, text: string, isSyntaxError: boolean) => unknown)
    | undefined;
}

function onEsEvaluationError(error: unknown, _text: string, _isSyntaxError: boolean): never {
  throw error;
}
