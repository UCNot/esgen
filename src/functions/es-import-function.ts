import { esline } from '../code/esline.tag.js';
import { esImport } from '../symbols/es-import.js';
import { EsImportInit, EsImportSymbol } from '../symbols/es-import.symbol.js';
import { EsModule } from '../symbols/es-module.js';
import { EsFunctionNaming } from './es-function.js';
import { EsSignature } from './es-signature.js';

/**
 * Imports function from the given module.
 *
 * @typeParam TArgs - Type of function arguments definition.
 * @param from - Either source module instance, or {@link EsExternalModule external module} name.
 * @param name - Name of function to import.
 * @param args - Either function signature or arguments definition.
 * @param init - Import initialization options.
 * @returns
 */
export function esImportFunction<TArgs extends EsSignature.Args>(
  from: EsModule | string,
  name: string,
  args: EsSignature<TArgs> | TArgs,
  init?: Omit<EsImportInit.Default, 'createNaming'>,
): EsImportSymbol<EsFunctionNaming<TArgs>> {
  const signature = EsSignature.from(args);

  return esImport(from, name, {
    ...init,
    createNaming(naming, symbol) {
      return {
        ...naming,
        symbol,
        signature,
        call(args: EsSignature.ValuesOf<TArgs>) {
          return esline`${naming}${signature.call(args)}`;
        },
      };
    },
  });
}
