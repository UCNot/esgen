import { asis } from '@proc7ts/primitives';
import { jsStringLiteral } from 'httongue';
import { EsModule } from './es-module.js';
import { EsNamespace } from './es-namespace.js';
import { EsNaming, EsResolution, EsSymbol, EsSymbolInit } from './es-symbol.js';

/**
 * Symbol of the import from some {@link EsModule module}.
 *
 * The symbol is automatically imported and named in {@link EsBundle#ns bundle namespace} whenever referred.
 */
export class EsImportSymbol<
  out TNaming extends EsNaming = EsImportNaming,
> extends EsSymbol<TNaming> {

  readonly #from: EsModule;
  readonly #importName: string;
  readonly #createNaming: EsImportInit.Namer<TNaming>;

  /**
   * Constructs new imported symbol.
   *
   * @param from - Source module the symbol is imported from.
   * @param importName - The name of imported symbol. I.e. the name of the module export.
   * @param init - Import initialization options.
   */
  constructor(
    from: EsModule,
    importName: string,
    ...init: EsImportNaming extends TNaming ? [EsImportInit<TNaming>?] : [EsImportInit<TNaming>]
  );

  constructor(
    from: EsModule,
    importName: string,
    init: Partial<EsImportInit.Custom<TNaming>> = {},
  ) {
    const { as = importName, createNaming = asis as EsImportInit.Namer<TNaming> } = init;

    super(as, init);

    this.#importName = importName;
    this.#from = from;
    this.#createNaming = createNaming;
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

  /**
   * Automatically imports this symbol when it is {@link EsNamespace#refer referred}.
   *
   * @param resolution - Symbol resolution.
   * @param ns - Referring namespace.
   *
   * @returns Imported symbol resolution resolution.
   */
  override refer(
    resolution: EsResolution<TNaming, this>,
    ns: EsNamespace,
  ): EsResolution<TNaming, this> {
    ns.scope.bundle.ns.addSymbol(this, naming => ns.scope.imports.addImport(this, naming, this.#createNaming));

    return resolution;
  }

  override toString(): string {
    const { requestedName, comment } = this;

    return comment.appendTo(requestedName, `[from ${jsStringLiteral(this.from.moduleName, '"')}]`);
  }

}

/**
 * {@link EsImportSymbol Import} initialization options.
 *
 * @typeParam TNaming - Import naming type.
 */
export type EsImportInit<TNaming extends EsNaming = EsImportNaming> = EsImportNaming extends TNaming
  ? EsImportInit.Default
  : EsImportInit.Custom<TNaming>;

export namespace EsImportInit {
  /**
   * Default {@link EsImportSymbol import} initialization options.
   *
   * @typeParam TNaming - Import naming type.
   */
  export interface Default<out TNaming extends EsNaming = EsNaming>
    extends Omit<EsSymbolInit, 'declare'> {
    /**
     * Requested symbol name.
     *
     * @defaultValue The same as import name.
     */
    readonly as?: string | undefined;

    /**
     * Creates import naming specific to particular symbol type.
     */
    readonly createNaming?: Namer<TNaming> | undefined;
  }

  /**
   * Custom {@link EsImportSymbol import} initialization options.
   *
   * @typeParam TNaming - Import naming type.
   */
  export interface Custom<out TNaming extends EsNaming> extends Default<TNaming> {
    readonly createNaming: Namer<TNaming>;
  }

  /**
   * {@link EsImportSymbol Import} namer signature.
   *
   * @typeParam TNaming - Import naming type.
   */
  export type Namer<out TNaming extends EsNaming> = {
    /**
     * Creates import naming specific to particular symbol type.
     *
     * @param naming - Default import naming.
     * @param symbol - Named symbol.
     *
     * @returns Import naming specific to symbol type.
     */
    createNaming(this: void, naming: EsNaming, symbol: EsImportSymbol<TNaming>): TNaming;
  }['createNaming'];
}

/**
 * Imported symbol naming within (bundle) namespace.
 */
export interface EsImportNaming extends EsNaming {
  readonly symbol: EsImportSymbol;
}
