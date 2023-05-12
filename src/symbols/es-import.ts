import { EsExternalModule } from './es-external-module.js';
import { EsImportedSymbol } from './es-imported-symbol.js';

/**
 * Creates a symbol imported from the named {@link EsExternalModule external module}.
 *
 * @param from - Source module name.
 * @param name - Name of symbol to import.
 *
 * @returns Imported symbol instance.
 */
export function esImport(from: string, name: string): EsImportedSymbol {
  return EsExternalModule.byName(from).import(name);
}
