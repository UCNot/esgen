import { jsStringLiteral } from 'httongue';
import { EsEmission } from '../emission/es-emission.js';
import { EsModule } from './es-module.js';
import { EsSymbol } from './es-symbol.js';

/**
 * Symbol imported from some {@link EsModule module}.
 *
 * The symbol is automatically imported and bound to {@link EsBundle#ns top-level bundle namespace} whenever used.
 */
export class EsImportedSymbol extends EsSymbol {

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

  override emit(emission: EsEmission): EsEmission.Result;
  override emit({ imports }: EsEmission): EsEmission.Result {
    return imports.import(this);
  }

  override toString(): string {
    return (
      `import { ${this.requestedName}`
      + (this.comment ? ` /* ${this.comment} */` : '')
      + ` } from ${jsStringLiteral(this.from.moduleName, '"')}`
    );
  }

}
