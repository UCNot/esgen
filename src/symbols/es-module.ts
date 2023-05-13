import { jsStringLiteral } from 'httongue';
import { EsBundleFormat } from '../emission/es-bundle-format.js';
import { EsOutput, EsPrinter } from '../es-output.js';
import { EsImportBinding, EsImportInit, EsImportedSymbol } from './es-imported-symbol.js';
import { EsImports } from './es-imports.js';

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
   * @param init - Import initialization options.
   *
   * @returns Imported symbol instance.
   */
  import(name: string, init?: EsImportInit): EsImportedSymbol {
    return new EsImportedSymbol(this, name, init);
  }

  /**
   * Starts imports from this module to the given collection of import declarations.
   *
   * Called at most once per bundle when first import added.
   *
   * @param imports - Target collection of import declaration.
   *
   * @returns Collection of imports from this module to the given collection of import declarations.
   */
  startImports(imports: EsImports): EsModuleImports;
  startImports({ bundle: { format } }: EsImports): EsModuleImports {
    const bindings = new Map<string, EsImportBinding>();

    return {
      printTo: out => {
        out.print(this.#printImports(format, bindings));
      },
      addImport({ importName }, name) {
        bindings.set(importName, name);
      },
      findImport({ requestedName }) {
        return bindings.get(requestedName);
      },
    };
  }

  #printImports(format: EsBundleFormat, imports: ReadonlyMap<string, EsImportBinding>): EsPrinter {
    switch (format) {
      case EsBundleFormat.ES2015:
        return this.#printStaticImports(imports);
      case EsBundleFormat.IIFE:
        return this.#printDynamicImports(imports);
    }
  }

  #printStaticImports(names: ReadonlyMap<string, EsImportBinding>): EsPrinter {
    return {
      printTo: out => {
        const from = jsStringLiteral(this.moduleName);

        if (names.size > 1) {
          out
            .print(`import {`)
            .indent(out => {
              for (const [importName, { name }] of names) {
                out.print(`${this.#printStaticClause(importName, name)},`);
              }
            })
            .print(`} from ${from};`);
        } else {
          for (const [importName, { name }] of names) {
            out.print(`import { ${this.#printStaticClause(importName, name)} } from ${from};`);
          }
        }
      },
    };
  }

  #printStaticClause(importName: string, name: string): string {
    return importName === name ? importName : `${importName} as ${name}`;
  }

  #printDynamicImports(imports: ReadonlyMap<string, EsImportBinding>): EsPrinter {
    return {
      printTo: out => {
        const from = jsStringLiteral(this.moduleName);

        if (imports.size > 1) {
          out
            .print('const {')
            .indent(out => {
              for (const [importName, { name }] of imports) {
                out.print(`${this.#printDynamicClause(importName, name)},`);
              }
            })
            .print(`} = await import(${from});`);
        } else {
          for (const [importName, { name }] of imports) {
            out.print(
              `const { ${this.#printDynamicClause(importName, name)} } = await import(${from});`,
            );
          }
        }
      },
    };
  }

  #printDynamicClause(importName: string, name: string): string {
    return importName === name ? importName : `${importName}: ${name}`;
  }

  toString(): string {
    return `Module ${jsStringLiteral(this.moduleName, '"')}`;
  }

}

/**
 * Collection of imports from module to particular bundle.
 *
 * Created {@link EsModule#startImports once} per bundle.
 */
export interface EsModuleImports extends EsPrinter {
  /**
   * Prints the imports clause to the given output.
   */
  printTo(out: EsOutput): void | PromiseLike<void>;

  /**
   * Adds new import from this module.
   *
   * @param symbol - Imported symbol.
   * @param binding - Binding of imported `symbol`.
   */
  addImport(symbol: EsImportedSymbol, binding: EsImportBinding): void;

  /**
   * Searches for the import of the `symbol`.
   *
   * @param symbol - Imported symbol.
   *
   * @returns Either previously {@link addImport added} symbol binding, or falsy value if the import not added yet.
   */
  findImport(symbol: EsImportedSymbol): EsImportBinding | undefined | null;
}
