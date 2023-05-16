import { EsSource } from '../es-source.js';
import { esline } from '../esline.tag.js';
import { EsAnySymbol, EsNaming } from '../symbols/es-symbol.js';
import { EsCallable } from './es-callable.js';
import { EsSignature } from './es-signature.js';

/**
 * Abstract function.
 *
 * Refers the function {@link symbol} and contains arguments {@link signature},
 *
 * @typeParam TArgs - Type of function arguments definition.
 * @typeParam TNaming - Type of function symbol naming.
 * @typeParam TSymbol - Type of function symbol.
 */
export abstract class EsFunction<
  out TArgs extends EsSignature.Args,
  out TNaming extends EsNaming = EsNaming,
  out TSymbol extends EsAnySymbol<TNaming> = EsAnySymbol<TNaming>,
> extends EsCallable<TArgs, TNaming, TSymbol> {

  /**
   * Calls this function.
   *
   * @param args - Named argument values.
   *
   * @returns Source of code containing function call.
   */
  call(args: EsSignature.ValuesOf<TArgs>): EsSource {
    return esline`${this.symbol}${this.signature.call(args)}`;
  }

}
