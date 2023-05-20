import { EsSnippet } from '../es-snippet.js';
import { esline } from '../esline.tag.js';
import { EsLocalNaming, EsLocalSymbol, esLocal } from '../symbols/es-local.symbol.js';
import { EsSymbolInit } from '../symbols/es-symbol.js';
import { EsFunctionDeclaration, EsLambdaExpression } from './es-callable.js';
import { EsFunction } from './es-function.js';
import { EsSignature } from './es-signature.js';

/**
 * {@link EsLocalSymbol Local} function supposed to be {@link declare declared} prior to being used.
 *
 * @typeParam TArgs - Type of function arguments definition.
 */
export class EsLocalFunction<out TArgs extends EsSignature.Args> extends EsFunction<
  TArgs,
  EsLocalNaming,
  EsLocalSymbol
> {

  /**
   * Declares local function.
   *
   * @param body - Function body builder.
   * @param declaration - Function declaration details.
   *
   * @returns Function statement.
   */
  declare(
    body: (this: void, fn: this) => EsSnippet,
    declaration?: EsFunctionDeclaration<TArgs>,
  ): EsSnippet {
    return this.symbol.declare(({ naming: { name } }) => this.function(body, { ...declaration, name }));
  }

  /**
   * Declares local function initialized with lambda expression.
   *
   * @param body - Lambda body builder.
   * @param declaration - Lambda declaration details.
   *
   * @returns Lambda declaration statement.
   */
  declareLambda(
    body: (this: void, fn: this) => EsSnippet,
    declaration?: EsLambdaExpression<TArgs> & {
      /**
       * Variable specifier.
       *
       * @defaultValue `const`.
       */
      readonly spec?: 'const' | 'let' | 'var' | undefined;
    },
  ): EsSnippet {
    const spec = declaration?.spec ?? 'const';

    return this.symbol.declare(
      ({ naming }) => esline`${spec} ${naming} = ${this.lambda(body, declaration)};`,
    );
  }

}

/**
 * Creates local function.
 *
 * @param requestedName - Requested function name.
 * @param args - Either function signature or arguments definition.
 * @param init - Symbol initialization options.
 *
 * @returns New function instance.
 */
export function esLocalFunction<TArgs extends EsSignature.Args>(
  requestedName: string,
  args: TArgs | EsSignature<TArgs>,
  init?: EsSymbolInit,
): EsLocalFunction<TArgs> {
  return new EsLocalFunction(esLocal(requestedName, init), args);
}
