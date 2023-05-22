import { EsSnippet } from '../es-snippet.js';
import { esline } from '../esline.tag.js';
import { esFunctionOrBundle } from '../impl/es-function-or-bundle.js';
import {
  EsDeclarationContext,
  EsDeclarationPolicy,
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
  implements EsReference<EsFunctionNaming<TArgs>> {

  readonly #symbol: EsSymbol<EsFunctionNaming<TArgs>>;

  /**
   * Constructs function.
   *
   * @param requestedName - Requested symbol name.
   * @param args - Either function signature or arguments definition.
   * @param init - Function initialization options.
   */
  constructor(
    requestedName: string,
    args: EsSignature<TArgs> | TArgs,
    init: EsFunctionInit<TArgs> = {},
  ) {
    super(args);

    const { declare } = init;

    this.#symbol = new EsSymbol<EsFunctionNaming<TArgs>>(requestedName, {
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
  ): readonly [EsSnippet, EsFunctionNaming<TArgs>] {
    const { as } = policy;

    if (isLambda(as)) {
      return this.#declareLambda(context, policy);
    }

    return this.#declareFunction(context, policy);
  }

  /**
   * Function symbol.
   */
  get symbol(): EsSymbol<EsFunctionNaming<TArgs>> {
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

    if (isLambda(as)) {
      return this.symbol.declareSymbol({
        as: context => this.#declareLambda(context, request),
        at: as === EsFunctionKind.Var ? esFunctionOrBundle : undefined,
      });
    }

    return this.symbol.declareSymbol({
      as: context => this.#declareFunction(context, request),
      at: esFunctionOrBundle,
    });
  }

  #declareLambda(
    context: EsDeclarationContext,
    request: EsFunctionDeclarationRequest<TArgs> | EsFunctionDeclarationPolicy<TArgs>,
  ): readonly [EsSnippet, EsFunctionNaming<TArgs>] {
    const { naming } = context;
    const { as, body } = request;

    return [
      code => {
        code.line(
          as!,
          ' ',
          naming,
          ' = ',
          this.lambda(fn => body(fn, context), request),
          ';',
        );
      },
      this.#createNaming(naming),
    ];
  }

  #declareFunction(
    context: EsDeclarationContext,
    request: EsFunctionDeclarationRequest<TArgs> | EsFunctionDeclarationPolicy<TArgs>,
  ): readonly [EsSnippet, EsFunctionNaming<TArgs>] {
    const { naming } = context;
    const { as, body } = request;

    return [
      this.function(fn => body(fn, context), {
        ...request,
        name: naming.name,
        generator: as === EsFunctionKind.Generator,
      }),
      this.#createNaming(naming),
    ];
  }

  #createNaming(naming: EsNaming): EsFunctionNaming<TArgs> {
    return {
      ...naming,
      symbol: this.symbol,
      signature: this.signature,
      call: (args: EsSignature.ValuesOf<TArgs>) => esline`${naming}${this.signature.call(args)}`,
    };
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
    return async (code, { ns }) => {
      const naming = await ns.refer<EsFunctionNaming<TArgs>>(this).whenNamed();

      code.line(naming.call(args));
    };
  }

}

/**
 * Kind of function declaration.
 */
export enum EsFunctionKind {
  /**
   * Declared with `function` statement.
   */
  Function = 'function',

  /**
   * Declared with `function *` statement.
   */
  Generator = 'function*',

  /**
   * Declared as constant with lambda initializer.
   */
  Const = 'const',

  /**
   * Declared as variable with `let` keyword and lambda initializer.
   */
  Let = 'let',

  /**
   * Declared as variable with `var` keyword and lambda initializer.
   */
  Var = 'var',
}

function isLambda(
  kind: EsFunctionKind | undefined,
): kind is EsFunctionKind.Const | EsFunctionKind.Let | EsFunctionKind.Var {
  return (
    kind === EsFunctionKind.Const || kind === EsFunctionKind.Let || kind === EsFunctionKind.Var
  );
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
 * {@link EsFunction Function} naming within namespace.
 *
 * @typeParam TArgs - Type of function arguments definition.
 */
export interface EsFunctionNaming<out TArgs extends EsSignature.Args = EsSignature.Args>
  extends EsNaming {
  /**
   * Named function symbol.
   */
  readonly symbol: EsSymbol<EsFunctionNaming<TArgs>>;

  /**
   * Named function signature.
   */
  readonly signature: EsSignature<TArgs>;

  /**
   * Calls the function.
   *
   * @param args - Named argument values.
   *
   * @returns Function call expression.
   */
  call(
    this: void,
    ...args: EsSignature.RequiredKeyOf<TArgs> extends never
      ? [EsSignature.ValuesOf<TArgs>?]
      : [EsSignature.ValuesOf<TArgs>]
  ): EsSnippet;
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
   * @defaultValue - {@link EsFunctionKind.Function function}
   */
  readonly as?: EsFunctionKind | undefined;

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
  extends EsLambdaExpression<TArgs> {
  /**
   * Host to declare function.
   *
   * @defaultValue {@link EsFunctionKind.Function function}
   */
  readonly as?: EsFunctionKind | undefined;

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
