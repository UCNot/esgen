import { EsSnippet } from '../es-snippet.js';
import { EsSignature } from '../functions/es-signature.js';
import { EsLocalNaming, EsLocalSymbol } from '../symbols/es-local.symbol.js';
import { EsSymbolInit } from '../symbols/es-symbol.js';
import { EsClass, EsClassInit } from './es-class.js';

/**
 * Local {@link EsClass} supposed to be {@link declare declared} prior to being used.
 *
 * @typeParam TArgs - Type of class constructor arguments definition.
 */
export class EsLocalClass<out TArgs extends EsSignature.Args> extends EsClass<
  TArgs,
  EsLocalNaming,
  EsLocalSymbol
> {

  /**
   * Constructs local class.
   *
   * @param requestedName - Requested class name.
   * @param init - Local class initialization options.
   */
  constructor(
    requestedName: string,
    ...init: EsSignature.NoArgs extends TArgs
      ? [EsLocalClassInit<TArgs>?]
      : [EsLocalClassInit<TArgs>]
  );

  constructor(requestedName: string, init?: EsLocalClassInit<TArgs>) {
    super(new EsLocalSymbol(requestedName, init), init as EsClassInit<TArgs>);
  }

  declare(): EsSnippet {
    return this.symbol.declare(_context => super.declare());
  }

}

/**
 * Local {@link EsLocalClass class} initialization options.
 *
 * @typeParam TArgs - Type of class constructor arguments definition.
 */
export type EsLocalClassInit<TArgs extends EsSignature.Args> = EsClassInit<TArgs> & EsSymbolInit;
