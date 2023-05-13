import { jsStringLiteral } from 'httongue';
import { EsEmission } from '../emission/es-emission.js';
import { EsModule } from './es-module.js';
import { EsSymbol } from './es-symbol.js';

/**
 * Symbol imported from some {@link EsModule module}.
 *
 * The symbol is automatically imported and bound to {@link EsBundle#ns top-level bundle namespace} whenever used.
 */
export class EsImportedSymbol extends EsSymbol<EsImportedSymbol.Binding> {

  readonly #from: EsModule;
  readonly #importName: string;

  /**
   * Constructs new imported symbol.
   *
   * @param from - Source module the symbol is imported from.
   * @param importName - The name of imported symbol. I.e. the name of the module export.
   * @param init - Import initialization options.
   */
  constructor(from: EsModule, importName: string, init?: EsImportedSymbol.Init) {
    super(init?.as ?? importName, init);
    this.#importName = importName;
    this.#from = from;
  }

  /**
   * Source module the symbol is imported from.
   */
  get from(): EsModule {
    return this.#from;
  }

  /**
   * The name of imported symbol. I.e. the name of the module export.
   */
  get importName(): string {
    return this.#importName;
  }

  override bind(binding: EsSymbol.Binding): EsImportedSymbol.Binding {
    return binding.ns.emission.imports.addImport(this, binding);
  }

  override emit(emission: EsEmission): EsEmission.Result {
    return emission.bundle.ns.bindSymbol(this).name;
  }

  override toString(): string {
    return (
      `import { ${this.requestedName}`
      + (this.comment ? ` /* ${this.comment} */` : '')
      + ` } from ${jsStringLiteral(this.from.moduleName, '"')}`
    );
  }

}

export namespace EsImportedSymbol {
  /**
   * Import initialization options.
   */
  export interface Init extends EsSymbol.Init {
    /**
     * Requested symbol name.
     *
     * @defaultValue The same as import name.
     */
    readonly as?: string | undefined;
  }
  /**
   * Imported symbol binding to (bundle) namespace.
   */
  export interface Binding extends EsSymbol.Binding {
    /**
     * Source module the symbol is imported from.
     */
    readonly from: EsModule;
  }
}
