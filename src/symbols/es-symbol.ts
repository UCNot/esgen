import { noop } from '@proc7ts/primitives';
import { EsSnippet } from '../es-snippet.js';
import { EsEmissionResult, EsEmitter, EsScope } from '../scopes/es-scope.js';
import { esSafeId } from '../util/es-safe-id.js';
import { EsNamespace } from './es-namespace.js';
import { esSymbolString } from './es-symbol-string.js';

/**
 * Program symbol.
 *
 * Requests a {@link requestedName name} within program. The actual name, however, may differ to avoid naming conflicts.
 * In order to receive an actual name, the symbol has to be {@link EsNamespace#addSymbol named} first. Then, the symbol
 * becomes {@link EsNamespace#findSymbol visible} under its actual {@link EsNamespace#refer name} in target
 * namespace and its nested namespaces.
 *
 * @typeParam TNaming - Type of symbol naming.
 */
export class EsSymbol<out TNaming extends EsNaming = EsNaming>
  implements EsReference<TNaming>, EsEmitter {

  readonly #requestedName: string;
  readonly #declare: EsDeclarationPolicy<TNaming> | undefined;
  readonly #comment: string | undefined;

  /**
   * Constructs symbol.
   *
   * @param requestedName - Requested symbol name. Will be converted to {@link esSafeId ECMAScript-safe} identifier.
   * @param init - Initialization options.
   */
  constructor(requestedName: string, init: EsSymbolInit<TNaming> = {}) {
    this.#requestedName = esSafeId(requestedName);

    const { declare, comment } = init;

    this.#declare = declare;
    this.#comment = comment;
  }

  /**
   * Always refers to itself.
   */
  get symbol(): this {
    return this;
  }

  /**
   * Requested symbol name.
   *
   * Always {@link esSafeId ECMAScript-safe} identifier.
   */
  get requestedName(): string {
    return this.#requestedName;
  }

  /**
   * Human-readable symbol comment.
   */
  get comment(): string | undefined {
    return this.#comment;
  }

  /**
   * Informs whether this is a unique symbol.
   *
   * Non-unique symbols may be named multiple times in unrelated namespaces.
   *
   * @returns `true` by default.
   */
  isUnique(): boolean {
    return true;
  }

  /**
   * Adjusts this symbol resolution when it is {@link EsNamespace#refer referred}.
   *
   * Automatically declares the symbol if automatic declaration {@link EsSymbolInit#declare requested}, or does nothing
   * otherwise.
   *
   * @param resolution - Symbol resolution.
   * @param ns - Referring namespace.
   *
   * @returns Adjusted resolution.
   */
  refer(resolution: EsResolution<TNaming, this>, ns: EsNamespace): EsResolution<TNaming, this> {
    if (this.#declare) {
      this.#autoDeclareIn(ns, this.#declare);
    }

    return resolution;
  }

  #autoDeclareIn(ns: EsNamespace, policy: EsDeclarationPolicy<TNaming>): TNaming {
    return (
      ns.findSymbol(this)
      ?? ns.addSymbol(this, naming => ns.scope.bundle.declarations.declareSymbol(this, naming, policy))
    );
  }

  /**
   * Declares symbol in the most generic way.
   *
   * The symbol can be used after that.
   *
   * @param request - Symbol declaration request.
   *
   * @returns Symbol's declaration statement.
   */
  declareSymbol(request: EsDeclarationRequest<TNaming>): EsSnippet {
    return (code, scope) => {
      code.write(this.#declareIn(scope, request));
    };
  }

  #declareIn(scope: EsScope, { as }: EsDeclarationRequest<TNaming>): EsSnippet {
    let snippet!: EsSnippet;

    scope.ns.addSymbol(this, naming => {
      const [declSnippet, symbolNaming] = as({
        naming,
        refer: noop, // Local declaration order is not maintained.
      });

      snippet = declSnippet;

      return symbolNaming;
    });

    return snippet;
  }

  /**
   * Emits the name of the symbol visible to {@link EsScope#ns emission namespace}.
   *
   * @param scope - Code emission scope.
   *
   * @returns Emission result.
   */
  emit(scope: EsScope): EsEmissionResult {
    return scope.ns.refer<TNaming>(this).emit(scope);
  }

  /**
   * Builds a string representation of this symbol.
   *
   * @returns - String representation of this symbol.
   */
  toString({
    tag = '[Symbol]',
    comment = this.comment,
  }: {
    /**
     * Symbol tag to include. Defaults to `[Symbol]`.
     */
    readonly tag?: string | null | undefined;
    /**
     * Comment to include. Defaults to {@link comment symbol comment}.
     */
    readonly comment?: string | null | undefined;
  } = {}): string {
    const { requestedName } = this;

    return esSymbolString(requestedName, { tag, comment });
  }

}

/**
 * {@link EsSymbol Symbol} initialization options.
 *
 * @typeParam TNaming - Type of symbol naming.
 */
export interface EsSymbolInit<out TNaming extends EsNaming = EsNaming> {
  /**
   * Automatic symbol declaration policy.
   *
   * When specified, the symbol will be automatically declared once referenced.
   *
   * When omitted, the symbol has to be explicitly {@link EsSymbol#declareSymbol declared} prior to being used.
   */
  readonly declare?: EsDeclarationPolicy<TNaming> | undefined;

  /**
   * Human-readable symbol comment used in its string representation.
   */
  readonly comment?: string | undefined;
}

/**
 * Explicit symbol {@link EsSymbol#declareSymbol declaration} request.
 *
 * @typeParam TNaming - Type of symbol naming.
 */
export interface EsDeclarationRequest<out TNaming extends EsNaming = EsNaming> {
  /**
   * Declares symbol.
   *
   * @param context - Symbol declaration context.
   *
   * @returns Tuple of code snippet containing symbol declaration, and symbol naming.
   */
  as(this: void, context: EsDeclarationContext): readonly [declaration: EsSnippet, naming: TNaming];
}

/**
 * Automatic {@link EsSymbol symbol} declaration policy.
 *
 * @typeParam TNaming - Type of symbol naming.
 */
export interface EsDeclarationPolicy<out TNaming extends EsNaming = EsNaming> {
  /**
   * Where to place the symbol declaration.
   */
  readonly at: EsDeclarationLocation;

  /**
   * Other symbols the declared one refers.
   *
   * Referred symbols supposed to be declared _before_ the referrer.
   */
  readonly refers?: EsReference | readonly EsReference[] | undefined;

  /**
   * Declares symbol on demand.
   *
   * @param context - Symbol declaration context.
   *
   * @returns Tuple of code snippet containing symbol declaration, and symbol naming.
   */
  as(this: void, context: EsDeclarationContext): readonly [declaration: EsSnippet, naming: TNaming];
}

/**
 * Symbol declaration context.
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

/**
 * Location of symbol declaration.
 *
 * One of:
 *
 * - `bundle` - for top-level symbol internal to the bundle,
 * - `exports` - for top-level symbol exported from the bundle.
 */
export type EsDeclarationLocation = 'bundle' | 'exports';

/**
 * Symbol reference.
 *
 * @typeParam TNaming - Type of symbol naming.
 * @typeParam TSymbol - Type of symbol.
 */
export interface EsReference<
  out TNaming extends EsNaming = EsNaming,
  out TSymbol extends EsSymbol<TNaming> = EsSymbol<TNaming>,
> {
  /**
   * Referred symbol.
   */
  readonly symbol: TSymbol;
}

/**
 * Resolution of {@link EsNamespace#refer referred symbol}.
 *
 * @typeParam TNaming - Type of symbol naming.
 * @typeParam TSymbol - Type of symbol.
 */
export interface EsResolution<
  out TNaming extends EsNaming = EsNaming,
  out TSymbol extends EsSymbol<TNaming> = EsSymbol<TNaming>,
> extends EsReference<TNaming, TSymbol>,
    EsEmitter {
  /**
   * Referred symbol.
   */
  readonly symbol: TSymbol;

  /**
   * Obtains immediately available naming of the {@link symbol}.
   *
   * Fails if the symbol is not named yet. Alternatively, it is possible to {@link whenNamed wait} for naming.
   *
   * @returns Symbol naming
   *
   * @throws [ReferenceError] if symbol is unnamed or invisible to target namespace.
   *
   * [ReferenceError]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/ReferenceError
   */
  getNaming(): TNaming;

  /**
   * Awaits for the {@link symbol} to be named.
   *
   * The naming may not be {@link getNaming immediately available}. This method allows to wait for it.
   *
   * This method won't wait infinitely though, and would fail if the symbol is not named for some time.
   *
   * @returns Promise resolved to symbol naming, or rejected if symbol is not named after some timeout.
   */
  whenNamed(): Promise<TNaming>;

  /**
   * Emits the code containing {@link symbol} name.
   *
   * @param scope - Code emission scope.
   *
   * @returns Code emission result.
   */
  emit(this: void, scope: EsScope): EsEmissionResult;
}

/**
 * Information on symbol {@link EsNamespace#findSymbol naming} within namespace.
 */
export interface EsNaming extends EsEmitter {
  /**
   * Named symbol
   */
  readonly symbol: EsSymbol;

  /**
   * Namespace the symbol is visible in.
   */
  readonly ns: EsNamespace;

  /**
   * The name used to refer the symbol.
   */
  readonly name: string;

  /**
   * Emits symbol name.
   *
   * @param scope - Code emission scope.
   *
   * @returns Emission result.
   */
  emit(this: void, scope: EsScope): EsEmissionResult;
}
