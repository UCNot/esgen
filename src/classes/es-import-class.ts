import { esline } from '../esline.tag.js';
import { EsSignature } from '../functions/es-signature.js';
import { esImport } from '../symbols/es-import.js';
import { EsImportInit, EsImportSymbol } from '../symbols/es-import.symbol.js';
import { EsModule } from '../symbols/es-module.js';
import { EsClassNaming } from './es-class.js';

/**
 * Imports class from the given module.
 *
 * @typeParam TArgs - Type of class constructor arguments definition.
 * @param from - Either source module instance, or {@link EsExternalModule external module} name.
 * @param name - Name of class to import.
 * @param args - Either class constructor signature or arguments definition.
 * @param init - Import initialization options.
 * @returns
 */
export function esImportClass<TArgs extends EsSignature.Args>(
  from: EsModule | string,
  name: string,
  args: EsSignature<TArgs> | TArgs,
  init?: Omit<EsImportInit.Default, 'createNaming'>,
): EsImportSymbol<EsClassNaming<TArgs>> {
  const signature = EsSignature.for(args);

  return esImport(from, name, {
    ...init,
    createNaming(naming, symbol) {
      return {
        ...naming,
        symbol,
        signature,
        instantiate(args: EsSignature.ValuesOf<TArgs>) {
          return esline`new ${naming}${signature.call(args)}`;
        },
      };
    },
  });
}
