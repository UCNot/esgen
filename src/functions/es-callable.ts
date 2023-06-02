import { EsSnippet } from '../code/es-snippet.js';
import { EsScopeInit, EsScopeKind } from '../scopes/es-scope.js';
import { EsSignature } from './es-signature.js';

/**
 * Callable instance, such as {@link EsFunction function}, or {@link EsMethod method}.
 *
 * @typeParam TArgs - Type of function arguments definition.
 */
export class EsCallable<out TArgs extends EsSignature.Args> {

  readonly #signature: EsSignature<TArgs>;

  /**
   * Constructs callable.
   *
   * @param args - Either function signature or arguments definition.
   */
  constructor(args: EsSignature<TArgs> | TArgs) {
    this.#signature = EsSignature.from(args);
  }

  /**
   * Function signature.
   */
  get signature(): EsSignature<TArgs> {
    return this.#signature;
  }

  /**
   * Per-argument symbols available by their {@link EsArg.NameOf names}.
   *
   * This is a shorthand of `this.signature.args`.
   */
  get args(): EsSignature.Symbols<TArgs> {
    return this.signature.args;
  }

  /**
   * Builds lambda expression.
   *
   * @param body - Function body builder.
   * @param expression - Lambda expression details.
   *
   * @returns Lambda expression.
   */
  lambda(
    body: (this: void, fn: this) => EsSnippet,
    expression?: EsLambdaExpression<TArgs>,
  ): EsSnippet;

  lambda(
    body: (this: void, fn: this) => EsSnippet,
    { async, args, scope }: EsLambdaExpression<TArgs> = {},
  ): EsSnippet {
    return code => {
      code.scope(
        {
          ...scope,
          kind: EsScopeKind.Function,
          async,
          generator: false,
          ns: {
            ...scope?.ns,
            comment: scope?.ns?.comment ?? `[${this.signature} => {}]`,
          },
        },
        code => {
          code.multiLine(code => {
            code
              .line(async ? 'async ' : '', this.signature.declare(args), ' => {')
              .indent(body(this))
              .write('}');
          });
        },
      );
    };
  }

  /**
   * Builds function expression.
   *
   * @param body - Function body builder.
   * @param expression - Function expression details.
   *
   * @returns Function expression.
   */
  function(
    body: (this: void, fn: this) => EsSnippet,
    expression?: EsFunctionExpression<TArgs>,
  ): EsSnippet;

  function(
    body: (this: void, fn: this) => EsSnippet,
    { async, generator, name = '', args, scope }: EsFunctionExpression<TArgs> = {},
  ): EsSnippet {
    return code => {
      code.scope(
        {
          ...scope,
          kind: EsScopeKind.Function,
          async,
          generator,
          ns: {
            ...scope?.ns,
            comment: scope?.ns?.comment ?? `[function ${name}${this.signature}]`,
          },
        },
        code => {
          code.multiLine(code => {
            code
              .line(
                async ? 'async ' : '',
                'function ',
                generator ? '*' : '',
                name,
                this.signature.declare(args),
                ' {',
              )
              .indent(body(this))
              .write('}');
          });
        },
      );
    };
  }

}

/**
 * {@link EsCallable#lambda Lambda expression} details.
 *
 * @typeParam TArgs - Type of lambda arguments definition.
 */
export interface EsLambdaExpression<out TArgs extends EsSignature.Args> {
  /**
   * Whether asynchronous function declared.
   */
  readonly async?: boolean | undefined;

  /**
   * Argument declarations.
   */
  readonly args?: EsSignature.Declarations<TArgs> | undefined;

  /**
   * Scope initialization options for lambda body.
   */
  readonly scope?: Omit<EsScopeInit, 'kind' | 'async' | 'generator'> | undefined;
}

/**
 * {@link EsCallable#function Function expression} details.
 *
 * @typeParam TArgs - Type of function arguments definition.
 */
export interface EsFunctionExpression<out TArgs extends EsSignature.Args>
  extends EsLambdaExpression<TArgs> {
  /**
   * Whether generator function declared.
   */
  readonly generator?: boolean | undefined;

  /**
   * Function name.
   *
   * Defaults to none.
   */
  readonly name?: string | undefined;
}
