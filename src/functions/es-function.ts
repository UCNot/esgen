import { EsSnippet } from '../es-snippet.js';
import { esline } from '../esline.tag.js';
import { EsNaming, EsSymbol } from '../symbols/es-symbol.js';
import { EsCallable } from './es-callable.js';
import { EsSignature } from './es-signature.js';

/**
 * Function representation.
 *
 * Function identified by unique {@link symbol} and has arguments {@link signature},
 *
 * @typeParam TArgs - Type of function arguments definition.
 * @typeParam TNaming - Type of function symbol naming.
 * @typeParam TSymbol - Type of function symbol.
 */
export class EsFunction<
  out TArgs extends EsSignature.Args,
  out TNaming extends EsNaming = EsNaming,
  out TSymbol extends EsSymbol<TNaming> = EsSymbol<TNaming>,
> extends EsCallable<TArgs> {

  readonly #symbol: TSymbol;

  /**
   * Constructs callable.
   *
   * @param symbol - Callable symbol.
   * @param args - Either function signature or arguments definition.
   */
  constructor(symbol: TSymbol, args: EsSignature<TArgs> | TArgs) {
    super(args);
    this.#symbol = symbol;
  }

  /**
   * Function symbol.
   */
  get symbol(): TSymbol {
    return this.#symbol;
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
