import { EsBundle } from '../emission/es-bundle.js';
import { EsEmission, EsEmitter } from '../emission/es-emission.js';
import { EsImportedSymbol } from './es-imported-symbol.js';
import { EsModule } from './es-module.js';

/**
 * Collection of {@link EsImportedSymbol imports} of the bundle.
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
   * Declares the import if not declared yet.
   *
   * @param symbol - Symbol to import into the bundle.
   *
   * @returns The name to use to refer the imported `symbol`.
   */
  import(symbol: EsImportedSymbol): string {
    const { from } = symbol;
    const { moduleId } = from;
    let moduleImports = this.#imports.get(moduleId);

    if (moduleImports) {
      const name = moduleImports.findName(symbol);

      if (name) {
        return name;
      }
    } else {
      moduleImports = from.startImports(this.#bundle);
      this.#imports.set(moduleId, moduleImports);
    }

    const name = this.#bundle.ns.bindSymbol(symbol);

    moduleImports.addImport(symbol, name);

    return name;
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
