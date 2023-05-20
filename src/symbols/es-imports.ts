import { EsBundle } from '../scopes/es-bundle.js';
import { EsEmissionResult, EsEmitter, EsScope } from '../scopes/es-scope.js';
import { EsImportNaming, EsImportedSymbol } from './es-imported.symbol.js';
import { EsModuleImports } from './es-module.js';
import { EsNaming } from './es-symbol.js';

/**
 * Collection of {@link EsImportedSymbol import} declarations of the bundle.
 *
 * Declared at bundle level.
 */
export class EsImports implements EsEmitter {

  readonly #imports = new Map<unknown, EsModuleImports>();
  readonly #bundle: EsBundle;

  /**
   * Constructs imports collection.
   *
   * @param bundle - Code bundle to import to.
   */
  constructor(bundle: EsBundle) {
    this.#bundle = bundle;
  }

  /**
   * Code bundle to import to.
   */
  get bundle(): EsBundle {
    return this.#bundle;
  }

  /**
   * Declares the import.
   *
   * @param symbol - Symbol to import into the bundle.
   * @param naming - Symbol naming.
   *
   * @returns Imported symbol naming.
   */
  addImport(symbol: EsImportedSymbol, naming: EsNaming): EsImportNaming {
    const { from } = symbol;
    const { moduleId } = from;
    let moduleImports = this.#imports.get(moduleId);

    if (moduleImports) {
      const importNaming = moduleImports.findImport(symbol);

      if (importNaming) {
        return importNaming;
      }
    } else {
      moduleImports = from.startImports(this);
      this.#imports.set(moduleId, moduleImports);
    }

    moduleImports.addImport(symbol, naming as EsImportNaming);

    return naming as EsImportNaming;
  }

  emit(_scope: EsScope): EsEmissionResult {
    return {
      printTo: out => {
        for (const moduleImports of this.#imports.values()) {
          out.print(moduleImports);
        }
      },
    };
  }

}
