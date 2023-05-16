import { EsEmissionInit } from '../emission/es-emission.js';
import { EsSource } from '../es-source.js';
import { EsAnySymbol, EsNaming, EsReference } from '../symbols/es-symbol.js';
import { EsSignature } from './es-signature.js';

/**
 * Abstract callable. E.g. {@link EsFunction function}, or {@link EsMethod method}.
 *
 * Refers the callable {@link symbol} and contains its {@link signature},
 *
 * @typeParam TArgs - Type of function arguments definition.
 * @typeParam TNaming - Type of function symbol naming.
 * @typeParam TSymbol - Type of function symbol.
 */
export abstract class EsCallable<
  out TArgs extends EsSignature.Args,
  out TNaming extends EsNaming = EsNaming,
  out TSymbol extends EsAnySymbol<TNaming> = EsAnySymbol<TNaming>,
> implements EsReference<TNaming, TSymbol> {

  readonly #symbol: TSymbol;
  readonly #signature: EsSignature<TArgs>;

  /**
   * Constructs callable.
   *
   * @param symbol - Callable symbol.
   * @param args - Either function signature or arguments definition.
   */
  constructor(symbol: TSymbol, args: EsSignature<TArgs> | TArgs) {
    this.#symbol = symbol;
    this.#signature = EsSignature.for(args);
  }

  /**
   * Function symbol.
   */
  get symbol(): TSymbol {
    return this.#symbol;
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
   * @returns Source of code containing lambda expression.
   */
  lambda(
    body: (this: void, fn: this) => EsSource,
    expression?: EsLambdaExpression<TArgs>,
  ): EsSource;

  lambda(
    body: (this: void, fn: this) => EsSource,
    { async, args, scope }: EsLambdaExpression<TArgs> = {},
  ): EsSource {
    return code => {
      code.scope(scope, code => {
        code.block(code => {
          code
            .inline(async ? 'async ' : '', this.signature.declare(args), ' => {')
            .indent(body(this))
            .write('}');
        });
      });
    };
  }

  /**
   * Builds function expression.
   *
   * @param body - Function body builder.
   * @param expression - Function expression details.
   *
   * @returns Source of code containing function expression.
   */
  function(
    body: (this: void, fn: this) => EsSource,
    expression?: EsFunctionExpression<TArgs>,
  ): EsSource;

  function(
    body: (this: void, fn: this) => EsSource,
    { async, generator, name, args, scope }: EsFunctionExpression<TArgs> = {},
  ): EsSource {
    return code => {
      code.scope(scope, code => {
        code.block(code => {
          code
            .inline(
              async ? 'async ' : '',
              'function ',
              generator ? '*' : '',
              name ?? '',
              this.signature.declare(args),
              ' {',
            )
            .indent(body(this))
            .write('}');
        });
      });
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
   * Emission initialization options for body scope.
   */
  readonly scope?: EsEmissionInit | undefined;
}

/**
 * {@link EsCallable#function Function expression} details.
 *
 * @typeParam TArgs - Type of function arguments definition.
 */
export interface EsFunctionExpression<out TArgs extends EsSignature.Args>
  extends EsFunctionDeclaration<TArgs> {
  /**
   * Function name.
   *
   * Defaults to none.
   */
  readonly name?: string | undefined;
}

/**
 * Details of variable declaration initialized with {@link EsCallable#lambda lambda expression}.
 *
 * @typeParam TArgs - Type of lambda arguments definition.
 */
export interface EsLambdaDeclaration<out TArgs extends EsSignature.Args>
  extends EsLambdaExpression<TArgs> {
  /**
   * Variable declaration specifier (`const`, `let`, or `var`).
   *
   * @defaultValue `const`.
   */
  readonly spec?: 'const' | 'let' | 'var';
}

/**
 * Details of function declaration.
 *
 * @typeParam TArgs - Type of lambda arguments definition.
 */
export interface EsFunctionDeclaration<out TArgs extends EsSignature.Args>
  extends EsLambdaExpression<TArgs> {
  /**
   * Whether generator function declared.
   */
  readonly generator?: boolean | undefined;
}
