import { EsBundle } from '../emission/es-bundle.js';
import { EsEmission, EsEmitter } from '../emission/es-emission.js';
import { EsImportedSymbol } from './es-imported-symbol.js';
import { EsModule } from './es-module.js';
import { EsSymbol } from './es-symbol.js';

/**
 * Collection of {@link EsImportedSymbol import} declarations of the bundle.
 *
 * Declared at bundle emission control.
 */
export class EsImports implements EsEmitter {

  readonly #imports = new Map<unknown, EsModule.Imports>();
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
   * @param binding - Symbol binding information.
   *
   * @returns Binding of imported symbol.
   */
  addImport(symbol: EsImportedSymbol, binding: EsSymbol.Binding): EsImportedSymbol.Binding {
    const { from } = symbol;
    const { moduleId } = from;
    let moduleImports = this.#imports.get(moduleId);

    if (moduleImports) {
      const importBinding = moduleImports.findImport(symbol);

      if (importBinding) {
        return importBinding;
      }
    } else {
      moduleImports = from.startImports(this);
      this.#imports.set(moduleId, moduleImports);
    }

    const importBinding: EsImportedSymbol.Binding = { ...binding, from };

    moduleImports.addImport(symbol, importBinding);

    return importBinding;
  }

  emit(_emission: EsEmission): EsEmission.Result {
    return {
      printTo: out => {
        for (const moduleImports of this.#imports.values()) {
          out.print(moduleImports);
        }
      },
    };
  }

}
