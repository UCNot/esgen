import {
  EsDeclarationInit,
  EsDeclarationNaming,
  EsDeclaredSymbol,
} from '../declarations/es-declared.symbol.js';
import { EsSignature } from '../functions/es-signature.js';
import { EsClass, EsClassInit } from './es-class.js';

/**
 * Class declared in bundle {@link EsDeclarations declarations}.
 *
 * @typeParam TArgs - Type of class constructor arguments definition.
 */
export class EsDeclaredClass<out TArgs extends EsSignature.Args> extends EsClass<
  TArgs,
  EsDeclarationNaming,
  EsDeclaredSymbol
> {

  /**
   * Constructs declared class.
   *
   * @param requestedName - Requested class name.
   * @param init - Initialization options.
   */
  constructor(
    requestedName: string,
    ...init: EsSignature.NoArgs extends TArgs
      ? [EsDeclaredClassInit<TArgs>?]
      : [EsDeclaredClassInit<TArgs>]
  );

  constructor(requestedName: string, init?: EsDeclaredClassInit<TArgs>) {
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

    super(symbol, init as EsClassInit<TArgs>);
  }

}

/**
 * Declared {@link EsDeclaredClass class} initialization options.
 *
 * @typeParam TArgs - Type of class constructor arguments definition.
 */
export type EsDeclaredClassInit<TArgs extends EsSignature.Args> = Omit<
  EsDeclarationInit,
  'declare'
> &
  EsClassInit<TArgs>;
