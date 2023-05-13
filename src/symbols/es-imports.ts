import { EsBundle } from '../emission/es-bundle.js';
import { EsEmission, EsEmissionResult, EsEmitter } from '../emission/es-emission.js';
import { EsImportNaming, EsImportedSymbol } from './es-imported-symbol.js';
import { EsModuleImports } from './es-module.js';
import { EsNaming } from './es-symbol.js';

/**
 * Collection of {@link EsImportedSymbol import} declarations of the bundle.
 *
 * Declared at bundle emission control.
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

    const importNaming: EsImportNaming = { ...naming, from };

    moduleImports.addImport(symbol, importNaming);

    return importNaming;
  }

  emit(_emission: EsEmission): EsEmissionResult {
    return {
      printTo: out => {
        for (const moduleImports of this.#imports.values()) {
          out.print(moduleImports);
        }
      },
    };
  }

}
