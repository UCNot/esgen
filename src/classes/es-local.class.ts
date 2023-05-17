import { EsSource } from '../es-source.js';
import { EsLocalNaming, EsLocalSymbol } from '../symbols/es-local.symbol.js';
import { EsSymbolInit } from '../symbols/es-symbol.js';
import { EsClass, EsClassInit } from './es-class.js';

/**
 * Local {@link EsClass} supposed to be {@link declare declared} prior to being used.
 */
export class EsLocalClass extends EsClass<EsLocalNaming, EsLocalSymbol> {

  /**
   * Constructs local class.
   *
   * @param requestedName - Requested class name.
   * @param init - Local class initialization options.
   */
  constructor(requestedName: string, init?: EsLocalClassInit) {
    super(new EsLocalSymbol(requestedName, init), init);
  }

  declare(): EsSource {
    return this.symbol.declare(_context => super.declare());
  }

}

export interface EsLocalClassInit extends EsClassInit, EsSymbolInit {}
