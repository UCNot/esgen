import { jsStringLiteral } from 'httongue';
import { EsEmission, EsEmissionResult } from '../emission/es-emission.js';
import { EsModule } from './es-module.js';
import { EsNaming, EsSymbol, EsSymbolInit } from './es-symbol.js';

/**
 * Symbol imported from some {@link EsModule module}.
 *
 * The symbol is automatically imported and named in {@link EsBundle#ns bundle namespace} whenever used.
 */
export class EsImportedSymbol extends EsSymbol<EsImportNaming> {

  readonly #from: EsModule;
  readonly #importName: string;

  /**
   * Constructs new imported symbol.
   *
   * @param from - Source module the symbol is imported from.
   * @param importName - The name of imported symbol. I.e. the name of the module export.
   * @param init - Import initialization options.
   */
  constructor(from: EsModule, importName: string, init?: EsImportInit) {
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

  override bind(naming: EsNaming): EsImportNaming {
    return naming.ns.emission.imports.addImport(this, naming);
  }

  override emit(emission: EsEmission): EsEmissionResult {
    return emission.bundle.ns.nameSymbol(this).name;
  }

  override toString({
    tag = `[from ${jsStringLiteral(this.from.moduleName, '"')}]`,
    comment = this.comment,
  }: {
    /**
     * Symbol tag to include. Defaults to `[from "${moduleName}"]`.
     */
    readonly tag?: string | null | undefined;
    /**
     * Comment to include. Defaults to {@link comment symbol comment}.
     */
    readonly comment?: string | null | undefined;
  } = {}): string {
    return super.toString({ tag, comment });
  }

}

/**
 * Import initialization options.
 */
export interface EsImportInit extends EsSymbolInit {
  /**
   * Requested symbol name.
   *
   * @defaultValue The same as import name.
   */
  readonly as?: string | undefined;
}

/**
 * Imported symbol naming within (bundle) namespace.
 */
export interface EsImportNaming extends EsNaming {
  /**
   * Source module the symbol is imported from.
   */
  readonly from: EsModule;
}
