import { asArray } from '@proc7ts/primitives';
import { EsSnippet } from '../es-snippet.js';
import { EsBundle } from '../scopes/es-bundle.js';
import { EsNamespace } from '../symbols/es-namespace.js';
import {
  EsNaming,
  EsReference,
  EsResolution,
  EsSymbol,
  EsSymbolInit,
} from '../symbols/es-symbol.js';

/**
 * Symbol declared in bundle {@link EsDeclarations declarations}.
 *
 * The symbol is automatically declared and named in {@link EsBundle#ns bundle namespace} whenever used.
 */
export class EsDeclaredSymbol extends EsSymbol<EsDeclarationNaming> {

  readonly #exported: boolean;
  readonly #refers: readonly EsReference[];
  readonly #declare: (context: EsDeclarationContext) => EsSnippet;

  /**
   * Constructs declared symbol.
   *
   * @param requestedName - Requested symbol name. Make sure this is a valid ECMAScript name.
   * @param init - Declaration initialization options.
   */
  constructor(requestedName: string, init: EsDeclarationInit) {
    super(requestedName, init);

    const { exported = false, refers, declare } = init;

    this.#exported = exported;
    this.#refers = asArray(refers);
    this.#declare = declare;
  }

  /**
   * Whether this symbol is exported from the bundle.
   */
  get exported(): boolean {
    return this.#exported;
  }

  override refer(
    resolution: EsResolution<EsDeclarationNaming, this>,
    ns: EsNamespace,
  ): EsResolution<EsDeclarationNaming, this> {
    this.#declareIn(ns);

    return resolution;
  }

  #declareIn({
    scope: {
      bundle: { ns, declarations },
    },
  }: EsNamespace): EsDeclarationNaming {
    return (
      ns.findSymbol(this)
      ?? ns.addSymbol(this, naming => declarations.addDeclaration(this, naming) as EsDeclarationNaming)
    );
  }

  /**
   * Declares the symbol.
   *
   * Called on demand, at most once per bundle.
   *
   * @param context - Declaration context.
   *
   * @returns Code snippet containing declaration.
   */
  declare(context: EsDeclarationContext): EsSnippet {
    return code => {
      for (const ref of this.#refers) {
        context.refer(ref);
      }
      code.write(this.#declare(context));
    };
  }

  override toString({
    tag = '[Declared]',
    comment,
  }: {
    /**
     * Symbol tag to include. Defaults to `[Declared]`
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
 * Declaration initialization options.
 */
export interface EsDeclarationInit extends EsSymbolInit {
  /**
   * Whether the symbol is exported.
   *
   * If `true`, then the symbol will be exported under {@link EsDeclaredSymbol#requestedName requested name}.
   */
  readonly exported?: boolean | undefined;

  /**
   * Other symbols the declared one refers.
   *
   * Referred symbols supposed to be declared _before_ the referrer.
   */
  readonly refers?: EsReference | readonly EsReference[] | undefined;

  /**
   * Declares the symbol.
   *
   * Called on demand, at most once per bundle.
   *
   * @param context - Declaration context.
   *
   * @returns Code snippet containing declaration.
   */
  declare(this: void, context: EsDeclarationContext): EsSnippet;
}

/**
 * Declared symbol naming.
 */
export interface EsDeclarationNaming extends EsNaming {
  readonly symbol: EsDeclaredSymbol;
}

/**
 * Declaration context.
 */
export interface EsDeclarationContext {
  /**
   * Declared symbol naming.
   */
  readonly naming: EsNaming;

  /**
   * Refers the given symbol.
   *
   * Referred symbols supposed to be declared _before_ the referrer.
   *
   * @param ref - Referred symbol.
   */
  refer(this: void, ref: EsReference): void;
}
