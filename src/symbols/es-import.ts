import { EsExternalModule } from './es-external-module.js';
import { EsImportInit, EsImportSymbol } from './es-import.symbol.js';
import { EsModule } from './es-module.js';
import { EsNaming } from './es-symbol.js';

/**
 * Imports symbol the given module with custom naming.
 *
 * @param TNaming - Import naming type.
 * @param from - Either source module instance, or {@link EsExternalModule external module} name.
 * @param name - Name of symbol to import.
 * @param init - Import initialization options.
 *
 * @returns Imported symbol instance.
 */
export function esImport<TNaming extends EsNaming>(
  from: EsModule | string,
  name: string,
  init: EsImportInit.Custom<TNaming>,
): EsImportSymbol<TNaming>;

/**
 * Imports symbol from the given module.
 *
 * @param from - Either source module instance, or {@link EsExternalModule external module} name.
 * @param name - Name of symbol to import.
 * @param init - Import initialization options.
 *
 * @returns Imported symbol instance.
 */
export function esImport(
  from: EsModule | string,
  name: string,
  init?: EsImportInit.Default,
): EsImportSymbol;

export function esImport<TNaming extends EsNaming>(
  from: EsModule | string,
  name: string,
  init?: EsImportInit<TNaming>,
): EsImportSymbol<TNaming> {
  const sourceModule = typeof from === 'string' ? EsExternalModule.byName(from) : from;

  return sourceModule.import(name, init as EsImportInit.Custom<TNaming>);
}
