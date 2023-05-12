import { jsStringLiteral } from 'httongue';
import { EsBundleFormat } from '../emission/es-bundle-format.js';
import { EsBundle } from '../emission/es-bundle.js';
import { EsOutput, EsPrinter } from '../es-output.js';
import { EsImportedSymbol } from './es-imported-symbol.js';

/**
 * Module is a source of {@link EsImportedSymbol imported symbols}.
 */
export abstract class EsModule {

  /**
   * Unique module identifier.
   *
   * Imports from the modules with the same identifier are combined.
   *
   * @defaultValue `this` instance.
   */
  get moduleId(): unknown {
    return this;
  }

  /**
   * The name of the module to use in the import clause.
   */
  abstract get moduleName(): string;

  /**
   * Creates symbol imported from this module.
   *
   * @param name - Name of symbol to import.
   *
   * @returns Imported symbol instance.
   */
  import(name: string): EsImportedSymbol {
    return new EsImportedSymbol(this, name);
  }

  /**
   * Starts imports from this module to the given `bundle`.
   *
   * Called at most once per bundle when the first import added.
   *
   * @param bundle - Target bundle.
   *
   * @returns Collection of imports from this module to the given `bundle`
   */
  startImports(bundle: EsBundle): EsModule.Imports;
  startImports({ format }: EsBundle): EsModule.Imports {
    const names = new Map<string, string>();

    return {
      printTo: out => {
        out.print(this.#printImports(format, names));
      },
      addImport({ requestedName }, name) {
        names.set(requestedName, name);
      },
      findName({ requestedName }) {
        return names.get(requestedName);
      },
    };
  }

  #printImports(format: EsBundleFormat, imports: ReadonlyMap<string, string>): EsPrinter {
    switch (format) {
      case EsBundleFormat.ES2015:
        return this.#printStaticImports(imports);
      case EsBundleFormat.IIFE:
        return this.#printIIFEImports(imports);
    }
  }

  #printStaticImports(names: ReadonlyMap<string, string>): EsPrinter {
    const from = jsStringLiteral(this.moduleName);

    return {
      printTo: out => {
        if (names.size > 1) {
          out
            .print(`import {`)
            .indent(out => {
              for (const [name, alias] of names) {
                out.print(`${this.#printStaticClause(name, alias)},`);
              }
            })
            .print(`} from ${from};`);
        } else {
          for (const [name, alias] of names) {
            out.print(`import { ${this.#printStaticClause(name, alias)} } from ${from};`);
          }
        }
      },
    };
  }

  #printStaticClause(name: string, alias: string): string {
    return name === alias ? name : `${name} as ${alias}`;
  }

  #printIIFEImports(imports: ReadonlyMap<string, string>): EsPrinter {
    const from = jsStringLiteral(this.moduleName);

    return {
      printTo: out => {
        if (imports.size > 1) {
          out
            .print('const {')
            .indent(out => {
              for (const [name, alias] of imports) {
                out.print(`${this.#printIIFEClause(name, alias)},`);
              }
            })
            .print(`} = await import(${from});`);
        } else {
          for (const [name, alias] of imports) {
            out.print(`const { ${this.#printIIFEClause(name, alias)} } = await import(${from});`);
          }
        }
      },
    };
  }

  #printIIFEClause(name: string, alias: string): string {
    return name === alias ? name : `${name}: ${alias}`;
  }

  toString(): string {
    return `Module ${jsStringLiteral(this.moduleName, '"')}`;
  }

}

export namespace EsModule {
  /**
   * Collection of module imports to particular bundle.
   *
   * Created {@link EsModule#startImports once} per bundle.
   */
  export interface Imports extends EsPrinter {
    /**
     * Prints the imports clause to the given output.
     */
    printTo(out: EsOutput): void | PromiseLike<void>;

    /**
     * Adds new import from this module.
     *
     * @param symbol - Imported symbol.
     * @param name - Name used to refer the imported `symbol`.
     */
    addImport(symbol: EsImportedSymbol, name: string): void;

    /**
     * Searches for the name used to access the imported symbol within bundle.
     *
     * @param symbol - Imported symbol.
     *
     * @returns Either previously {@link addImport added} import name, or falsy value if the import did not added yet.
     */
    findName(symbol: EsImportedSymbol): string | undefined | null;
  }
}
