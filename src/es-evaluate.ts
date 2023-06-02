import { EsOutput } from './code/es-output.js';
import { EsSnippet } from './code/es-snippet.js';
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
 */
export function esEvaluate(...snippets: EsSnippet[]): Promise<unknown>;

export async function esEvaluate(
  ...args: [EsEvaluationOptions, ...EsSnippet[]] | EsSnippet[]
): Promise<string> {
  const iife = await generateEsCode({ format: EsBundleFormat.IIFE }, ...args);
  const text = await new EsOutput().line(out => out.print('return ', iife, ';')).asText();

  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const factory = Function(text);

  return await factory();
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
