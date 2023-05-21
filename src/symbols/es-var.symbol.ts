import { EsSnippet } from '../es-snippet.js';
import {
  EsDeclarationContext,
  EsDeclarationPolicy,
  EsDeclarationRequest,
  EsNaming,
  EsSymbol,
  EsSymbolInit,
} from './es-symbol.js';

/**
 * Variable symbol.
 */
export class EsVarSymbol extends EsSymbol {

  constructor(requestedName: string, init: EsVarInit = {}) {
    const { declare } = init;

    super(requestedName, {
      ...init,
      declare: declare && {
        ...declare,
        as: context => this.#declare(context, declare, 'var'),
      },
    });
  }

  /**
   * Declares variable.
   *
   * @param request - Variable declaration request.
   *
   * @returns Variable declaration statement.
   */
  declare(request: EsVarDeclarationRequest = {}): EsSnippet {
    return this.declareSymbol({
      ...request,
      as: context => this.#declare(context, request, 'let'),
    });
  }

  #declare(
    context: EsDeclarationContext,
    { as, value }: EsVarDeclarationPolicy | EsVarDeclarationRequest,
    withoutVariable: 'let' | 'var',
  ): readonly [EsSnippet, EsNaming] {
    return [
      code => {
        code.line(code => {
          const init = value?.(context, this);

          code.write(as ?? init == null ? withoutVariable : 'const', ' ', context.naming);

          if (init) {
            code.write(' = ', init);
          }

          code.write(';');
        });
      },
      context.naming,
    ];
  }

}

/**
 * {@link EsVarSymbol Variable} initialization options.
 *
 * @typeParam TNaming - Type of symbol naming.
 */
export interface EsVarInit extends Omit<EsSymbolInit, 'declare'> {
  /**
   * Automatic variable declaration policy.
   *
   * When specified, the variable will be automatically declared once referenced.
   *
   * When omitted, the variable has to be explicitly {@link EsVarSymbol#declare declared} prior to being used.
   */
  readonly declare?: EsVarDeclarationPolicy | undefined;
}

/**
 * Automatic {@link EsVarSymbol variable} declaration policy.
 */
export interface EsVarDeclarationPolicy extends Omit<EsDeclarationPolicy, 'as'> {
  /**
   * How to declare variable.
   *
   * @defaultValue `const` when initial {@link value} specified, or `var` otherwise.
   */
  readonly as?: 'const' | 'let' | 'var' | undefined;

  /**
   * Emits initial value of the variable.
   *
   * @param context - Variable declaration context.
   * @param symbol - Variable symbol.
   *
   * @returns Variable initialization expression, or none to leave the variable uninitialized.
   *
   * @defaultValue `undefined`.
   */
  readonly value?:
    | ((this: void, context: EsDeclarationContext, symbol: EsVarSymbol) => EsSnippet | undefined)
    | undefined;
}

/**
 * Explicit variable {@link EsVarSymbol#declare declaration} request.
 */
export interface EsVarDeclarationRequest extends Omit<EsDeclarationRequest, 'as'> {
  /**
   * How to declare variable.
   *
   * @defaultValue `const` when initial {@link value} specified, or `let` otherwise.
   */
  readonly as?: 'const' | 'let' | 'var';

  /**
   * Emits initial value of the variable.
   *
   * @param context - Variable declaration context.
   * @param symbol - Variable symbol.
   *
   * @returns Variable initialization expression, or none to leave the variable uninitialized.
   *
   * @defaultValue `undefined`.
   */
  readonly value?:
    | ((this: void, context: EsDeclarationContext, symbol: EsVarSymbol) => EsSnippet | undefined)
    | undefined;
}
