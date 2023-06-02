import { jsStringLiteral } from 'httongue';
import { EsOutput, EsPrinter } from '../code/es-output.js';
import { EsBundleFormat } from '../scopes/es-bundle-format.js';
import { EsImportInit, EsImportSymbol } from './es-import.symbol.js';
import { EsImports } from './es-imports.js';
import { EsNaming } from './es-symbol.js';

/**
 * Module is a source of {@link EsImportSymbol imported symbols}.
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
   * Creates symbol imported from this module with custom naming.
   *
   * @typeParam TNaming - Import naming type.
   * @param name - Name of symbol to import.
   * @param init - Import initialization options.
   *
   * @returns Imported symbol instance.
   */
  import<TNaming extends EsNaming>(
    name: string,
    init: EsImportInit.Custom<TNaming>,
  ): EsImportSymbol<TNaming>;

  /**
   * Creates symbol imported from this module.
   *
   * @param name - Name of symbol to import.
   * @param init - Import initialization options.
   *
   * @returns Imported symbol instance.
   */
  import(name: string, init?: EsImportInit.Default): EsImportSymbol;

  import<TNaming extends EsNaming>(
    name: string,
    init: EsImportInit<TNaming>,
  ): EsImportSymbol<TNaming> {
    return new EsImportSymbol(this, name, init);
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
    const namings = new Map<string, EsNaming>();

    return {
      printTo: out => {
        out.print(this.#printImports(format, namings));
      },
      addImport({ importName }, name) {
        namings.set(importName, name);
      },
      findImport<TNaming extends EsNaming>({
        requestedName,
      }: EsImportSymbol<TNaming>): TNaming | undefined | null {
        return namings.get(requestedName) as TNaming;
      },
    };
  }

  #printImports(format: EsBundleFormat, imports: ReadonlyMap<string, EsNaming>): EsPrinter {
    switch (format) {
      case EsBundleFormat.ES2015:
        return this.#printStaticImports(imports);
      case EsBundleFormat.IIFE:
        return this.#printDynamicImports(imports);
    }
  }

  #printStaticImports(names: ReadonlyMap<string, EsNaming>): EsPrinter {
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

  #printDynamicImports(imports: ReadonlyMap<string, EsNaming>): EsPrinter {
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
   * @typeParam TNaming - Import naming type.
   * @param symbol - Imported symbol.
   * @param naming - Naming of imported `symbol` within namespace.
   */
  addImport<TNaming extends EsNaming>(symbol: EsImportSymbol<TNaming>, naming: TNaming): void;

  /**
   * Searches for the import of the `symbol`.
   *
   * @typeParam TNaming - Import naming type.
   * @param symbol - Imported symbol.
   *
   * @returns Either previously {@link addImport added} symbol naming, or falsy value if the import not added yet.
   */
  findImport<TNaming extends EsNaming>(symbol: EsImportSymbol<TNaming>): TNaming | undefined | null;
}
