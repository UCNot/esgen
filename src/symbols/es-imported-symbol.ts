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

  /**
   * Constructs new imported symbol.
   *
   * @param from - Source module the symbol is imported from.
   * @param requestedName - The name of imported imported symbol. I.e. the name of the module export.
   * @param init - Symbol initialization options.
   */
  constructor(from: EsModule, requestedName: string, init?: EsSymbol.Init) {
    super(requestedName, init);
    this.#from = from;
  }

  /**
   * Source module the symbol is imported from.
   */
  get from(): EsModule {
    return this.#from;
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
   * Imported symbol binding to (bundle) namespace.
   */
  export interface Binding extends EsSymbol.Binding {
    /**
     * Source module the symbol is imported from.
     */
    readonly from: EsModule;
  }
}
