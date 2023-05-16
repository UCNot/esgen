import {
  EsDeclarationContext,
  EsDeclarationInit,
  EsDeclarationNaming,
  EsDeclaredSymbol,
} from '../declarations/es-declared.symbol.js';
import { EsSource } from '../es-source.js';
import { EsFunctionDeclaration } from './es-callable.js';
import { EsFunction } from './es-function.js';
import { EsSignature } from './es-signature.js';

/**
 * Function declared in bundle {@link EsDeclarations declarations}.
 *
 * Automatically declared and named in {@link EsBundle#ns bundle namespace} whenever used.
 *
 * @typeParam TArgs - Type of function arguments definition.
 */
export class EsDeclaredFunction<out TArgs extends EsSignature.Args> extends EsFunction<
  TArgs,
  EsDeclarationNaming,
  EsDeclaredSymbol
> {

  /**
   * Constructs declared function.
   *
   * @param requestedName - Requested function name.
   * @param args - Either function signature or arguments definition.
   * @param init - Function declaration initialization options.
   */
  constructor(
    requestedName: string,
    args: EsSignature<TArgs> | TArgs,
    init: EsFunctionDeclarationInit<TArgs>,
  ) {
    const { body } = init;

    super(
      new EsDeclaredSymbol(requestedName, {
        ...init,
        declare: context => this.function(fn => body(fn, context), {
            ...init,
            name: context.naming.name,
          }),
      }),
      args,
    );
  }

}

/**
 * Function declaration initialization options.
 *
 * @typeParam TArgs - Type of function arguments definition.
 */
export interface EsFunctionDeclarationInit<out TArgs extends EsSignature.Args>
  extends Omit<EsDeclarationInit, 'declare'>,
    EsFunctionDeclaration<TArgs> {
  /**
   * Declares function body.
   *
   * Called on demand, at most once per bundle.
   *
   * @param fn - Declared function.
   * @param context - Function declaration context.
   *
   * @returns Source of code containing function body.
   */
  body(this: void, fn: EsDeclaredFunction<TArgs>, context: EsDeclarationContext): EsSource;
}
