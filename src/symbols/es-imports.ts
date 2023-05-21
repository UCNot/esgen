import { EsBundle } from '../scopes/es-bundle.js';
import { EsEmissionResult, EsEmitter, EsScope } from '../scopes/es-scope.js';
import { EsImportSymbol } from './es-import.symbol.js';
import { EsModuleImports } from './es-module.js';
import { EsNaming } from './es-symbol.js';

/**
 * Collection of {@link EsImportSymbol import} declarations of the bundle.
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
   * @typeParam TNaming - Import naming type.
   * @param symbol - Symbol to import into the bundle.
   * @param naming - Symbol naming.
   *
   * @returns Imported symbol naming.
   */
  addImport<TNaming extends EsNaming>(
    symbol: EsImportSymbol<TNaming>,
    naming: EsNaming,
    createNaming: (naming: EsNaming, symbol: EsImportSymbol<TNaming>) => TNaming,
  ): TNaming {
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

    const importNaming = createNaming(naming, symbol);

    moduleImports.addImport(symbol, importNaming);

    return importNaming;
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
