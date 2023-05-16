import {
  EsDeclarationContext,
  EsDeclarationInit,
  EsDeclarationNaming,
  EsDeclaredSymbol,
} from '../declarations/es-declared.symbol.js';
import { EsSource } from '../es-source.js';
import { esline } from '../esline.tag.js';
import { EsLambdaDeclaration } from './es-callable.js';
import { EsFunction } from './es-function.js';
import { EsSignature } from './es-signature.js';

/**
 * Lambda-function declared in bundle {@link EsDeclarations declarations}.
 *
 * Automatically declared and named in {@link EsBundle#ns bundle namespace} whenever used.
 *
 * @typeParam TArgs - Type of function arguments definition.
 */
export class EsDeclaredLambda<out TArgs extends EsSignature.Args> extends EsFunction<
  TArgs,
  EsDeclarationNaming,
  EsDeclaredSymbol
> {

  /**
   * Constructs declared lambda-function.
   *
   * @param requestedName - Requested function name.
   * @param args - Either function signature or arguments definition.
   * @param init - Function declaration initialization options.
   */
  constructor(
    requestedName: string,
    args: EsSignature<TArgs> | TArgs,
    init: EsLambdaDeclarationInit<TArgs>,
  ) {
    const { body, spec = 'const' } = init;

    super(
      new EsDeclaredSymbol(requestedName, {
        ...init,
        declare: context => esline`${spec} ${context.naming.name} = ${this.lambda(fn => body(fn, context), init)};`,
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
export interface EsLambdaDeclarationInit<out TArgs extends EsSignature.Args>
  extends Omit<EsDeclarationInit, 'declare'>,
    EsLambdaDeclaration<TArgs> {
  /**
   * Builds function body.
   *
   * @param fn - Declared function.
   * @param context - Function declaration context.
   *
   * @returns Source of code containing function body.
   */
  body(this: void, fn: EsDeclaredLambda<TArgs>, context: EsDeclarationContext): EsSource;
}
