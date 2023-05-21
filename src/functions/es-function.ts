import { EsSnippet } from '../es-snippet.js';
import { esline } from '../esline.tag.js';
import {
  EsDeclarationContext,
  EsDeclarationPolicy,
  EsDeclarationRequest,
  EsNaming,
  EsReference,
  EsSymbol,
  EsSymbolInit,
} from '../symbols/es-symbol.js';
import { EsCallable, EsLambdaExpression } from './es-callable.js';
import { EsSignature } from './es-signature.js';

/**
 * Function representation.
 *
 * Function identified by unique {@link symbol} and has arguments {@link signature},
 *
 * @typeParam TArgs - Type of function arguments definition.
 */
export class EsFunction<out TArgs extends EsSignature.Args>
  extends EsCallable<TArgs>
  implements EsReference {

  readonly #symbol: EsSymbol;

  /**
   * Constructs function.
   *
   * @param requestedName - Requested symbol name.
   * @param args - Either function signature or arguments definition.
   */
  constructor(
    requestedName: string,
    args: EsSignature<TArgs> | TArgs,
    init: EsFunctionInit<TArgs> = {},
  ) {
    super(args);

    const { declare } = init;

    this.#symbol = new EsSymbol(requestedName, {
      ...init,
      declare: declare && {
        ...declare,
        as: context => this.#autoDeclare(context, declare),
      },
    });
  }

  #autoDeclare(
    context: EsDeclarationContext,
    policy: EsFunctionDeclarationPolicy<TArgs>,
  ): readonly [EsSnippet, EsNaming] {
    const { as } = policy;

    if (as === 'const' || as === 'let' || as === 'var') {
      return this.#declareLambda(context, policy);
    }

    return this.#declareFunction(context, policy);
  }

  /**
   * Function symbol.
   */
  get symbol(): EsSymbol {
    return this.#symbol;
  }

  /**
   * Declares function.
   *
   * @param request - Function declaration request.
   *
   * @returns Function or lambda variable declaration statement statement.
   */
  declare(request: EsFunctionDeclarationRequest<TArgs>): EsSnippet {
    const { as } = request;

    if (as === 'const' || as === 'let' || as === 'var') {
      return this.symbol.declareSymbol({
        ...request,
        as: context => this.#declareLambda(context, request),
      });
    }

    return this.symbol.declareSymbol({
      ...request,
      as: context => this.#declareFunction(context, request),
    });
  }

  #declareLambda(
    context: EsDeclarationContext,
    request: EsFunctionDeclarationRequest<TArgs> | EsFunctionDeclarationPolicy<TArgs>,
  ): readonly [EsSnippet, EsNaming] {
    const { as, body } = request;

    return [
      code => {
        code.line(
          as!,
          ' ',
          context.naming,
          ' = ',
          this.lambda(fn => body(fn, context), request),
          ';',
        );
      },
      context.naming,
    ];
  }

  #declareFunction(
    context: EsDeclarationContext,
    request: EsFunctionDeclarationRequest<TArgs> | EsFunctionDeclarationPolicy<TArgs>,
  ): readonly [EsSnippet, EsNaming] {
    const { as, body } = request;

    return [
      this.function(fn => body(fn, context), {
        ...request,
        name: context.naming.name,
        generator: as === 'generator',
      }),
      context.naming,
    ];
  }

  /**
   * Calls this function.
   *
   * @param args - Named argument values.
   *
   * @returns Function call expression.
   */
  call(
    ...args: EsSignature.RequiredKeyOf<TArgs> extends never
      ? [EsSignature.ValuesOf<TArgs>?]
      : [EsSignature.ValuesOf<TArgs>]
  ): EsSnippet;

  call(args: EsSignature.ValuesOf<TArgs>): EsSnippet {
    return esline`${this.symbol}${this.signature.call(args)}`;
  }

}

/**
 * {@link EsFunction Function} initialization options.
 *
 * @typeParam TArgs - Type of function arguments definition.
 */
export interface EsFunctionInit<out TArgs extends EsSignature.Args>
  extends Omit<EsSymbolInit, 'declare'> {
  /**
   * Whether asynchronous function declared.
   */
  readonly async?: boolean | undefined;

  /**
   * Argument declarations.
   */
  readonly args?: EsSignature.Declarations<TArgs> | undefined;

  /**
   * Automatic function declaration policy.
   *
   * When specified, the function will be automatically declared once referenced.
   *
   * When omitted, the function has to be explicitly {@link EsFunction#declare declared} prior to being used.
   */
  readonly declare?: EsFunctionDeclarationPolicy<TArgs> | undefined;
}

/**
 * Automatic {@link EsFunction} declaration policy.
 *
 * @typeParam TArgs - Type of function arguments definition.
 */
export interface EsFunctionDeclarationPolicy<out TArgs extends EsSignature.Args>
  extends Omit<EsDeclarationPolicy, 'as'>,
    EsLambdaExpression<TArgs> {
  /**
   * Host to declare function.
   *
   * @defaultValue - `function`
   */
  readonly as?: 'function' | 'generator' | 'const' | 'let' | 'var' | undefined;

  /**
   * Emits function body.
   *
   * @param fn - Declared function instance.
   * @param context - Function declaration context.
   *
   * @returns Code snippet containing function body.
   */
  body(this: void, fn: EsFunction<TArgs>, context: EsDeclarationContext): EsSnippet;
}

/**
 * Explicit function {@link EsFunction#declare declaration} request.
 *
 * @typeParam TArgs - Type of function arguments definition.
 */
export interface EsFunctionDeclarationRequest<out TArgs extends EsSignature.Args>
  extends Omit<EsDeclarationRequest, 'as'>,
    EsLambdaExpression<TArgs> {
  /**
   * Host to declare function.
   *
   * @defaultValue - `function`
   */
  readonly as?: 'function' | 'generator' | 'const' | 'let' | 'var' | undefined;

  /**
   * Emits function body.
   *
   * @param fn - Declared function instance.
   * @param context - Function declaration context.
   *
   * @returns Code snippet containing function body.
   */
  body(this: void, fn: EsFunction<TArgs>, context: EsDeclarationContext): EsSnippet;
}
