import { EsOutput } from './code/es-output.js';
import { EsSnippet } from './code/es-snippet.js';
import { EsEvaluationError } from './es-evaluation.error.js';
import { generateEsCode } from './es-generate.impl.js';
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
 *
 * @throws Rejects with {@link EsEvaluationError} if code evaluation failed.
 */
export function esEvaluate(...snippets: EsSnippet[]): Promise<unknown>;

export async function esEvaluate(
  ...args: [EsEvaluationOptions, ...EsSnippet[]] | EsSnippet[]
): Promise<unknown> {
  const iife = await generateEsCode({ format: EsBundleFormat.IIFE }, ...args);
  const evaluatedCode = await new EsOutput().line(out => out.print('return ', iife, ';')).asText();
  let factory: () => Promise<unknown>;

  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    factory = new Function(evaluatedCode) as () => Promise<unknown>;
  } catch (error) {
    throw new EsEvaluationError('Syntax error', {
      cause: error,
      evaluatedCode,
      isSyntaxError: true,
    });
  }

  try {
    return await factory();
  } catch (error) {
    throw new EsEvaluationError(undefined, {
      cause: error,
      evaluatedCode,
    });
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
}
