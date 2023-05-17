import {
  EsDeclarationInit,
  EsDeclarationNaming,
  EsDeclaredSymbol,
} from '../declarations/es-declared.symbol.js';
import { EsClass, EsClassInit } from './es-class.js';

/**
 * Class declared in bundle {@link EsDeclarations declarations}.
 */
export class EsDeclaredClass extends EsClass<EsDeclarationNaming, EsDeclaredSymbol> {

  /**
   * Constructs declared class.
   *
   * @param requestedName - Requested class name.
   * @param init - Initialization options.
   */
  constructor(requestedName: string, init?: EsDeclaredClassInit) {
    const symbol = new EsDeclaredSymbol(requestedName, {
      ...init,
      declare: ({ refer }) => {
        const { baseClass } = this;

        if (baseClass) {
          refer(baseClass);
        }

        return this.declare();
      },
    });

    super(symbol, init);
  }

}

/**
 * Declared {@link EsDeclaredClass class} initialization options.
 */
export interface EsDeclaredClassInit extends Omit<EsDeclarationInit, 'declare'>, EsClassInit {}
