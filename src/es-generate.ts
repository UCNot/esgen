import { EsSnippet } from './code/es-snippet.js';
import { EsDeclarations } from './declarations/es-declarations.js';
import { generateEsCode } from './es-generate.impl.js';
import { EsBundleFormat } from './scopes/es-bundle-format.js';
import { EsBundle } from './scopes/es-bundle.js';
import { EsImports } from './symbols/es-imports.js';
import { EsNamespace } from './symbols/es-namespace.js';

/**
 * Generates code of the module.
 *
 * @param options - Code generation options.
 * @param snippets - Generated code snippets.
 *
 * @returns Promise resolved to module text.
 */
export function esGenerate(options: EsGenerationOptions, ...snippets: EsSnippet[]): Promise<string>;

/**
 * Generates code of the module in {@link EsBundleFormat.Default default format}.
 *
 * @param snippets - Generated code snippets.
 *
 * @returns Promise resolved to module text.
 */
export function esGenerate(...snippets: EsSnippet[]): Promise<string>;

export async function esGenerate(
  ...args: [EsGenerationOptions, ...EsSnippet[]] | EsSnippet[]
): Promise<string> {
  return await generateEsCode(undefined, ...args);
}

/**
 * Options for code {@link EsGenerator#generate generation}.
 */
export interface EsGenerationOptions {
  /**
   * Generated code format.
   *
   * @defaultValue {@link EsBundleFormat.Default}.
   */
  readonly format?: EsBundleFormat | undefined;

  /**
   * Bundle namespace factory.
   *
   * @defaultValue New namespace instance factory.
   */
  readonly ns?: ((this: void, bundle: EsBundle) => EsNamespace) | undefined;

  /**
   * Import declarations collection factory.
   *
   * @defaultValue New import declarations collection factory.
   */
  readonly imports?: ((this: void, bundle: EsBundle) => EsImports) | undefined;

  /**
   * Bundle declarations collection factory.
   *
   * @defaultValue New declarations collection factory.
   */
  readonly declarations?: ((this: void, bundle: EsBundle) => EsDeclarations) | undefined;
}
