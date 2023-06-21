import { whenNextEvent } from '@proc7ts/async';
import { lazyValue } from '@proc7ts/primitives';
import { EsComment } from '../code/es-comment.js';
import { EsScope } from '../scopes/es-scope.js';
import { EsNameRegistry } from './es-name-registry.js';
import { EsNaming, EsReference, EsResolution, EsSymbol } from './es-symbol.js';

/**
 * Namespace used to resolve naming conflicts.
 */
export class EsNamespace implements EsNamingHost {

  readonly #scope: EsScope;
  readonly #enclosing: EsNamespace | undefined;
  readonly #shared: EsNamespace$SharedState;
  readonly #names: EsNameRegistry;
  readonly #comment: EsComment;
  readonly #nonUniques = new Map<EsSymbol, EsNonUniqueNaming<any>>();
  #nestedSeq = 0;

  /**
   * Constructs namespace.
   *
   * @param scope - Code emission scope the namespace created for.
   * @param init - Initialization options.
   */
  constructor(scope: EsScope, init?: EsNamespaceInit);

  constructor(
    scope: EsScope,
    {
      enclosing,
      comment = enclosing
        ? `${enclosing}/${++enclosing.#nestedSeq}`
        : `Namespace #${++EsNamespace$seq}`,
    }: EsNamespaceInit = {},
  ) {
    this.#scope = scope;
    this.#enclosing = enclosing;

    if (enclosing) {
      this.#shared = enclosing.#shared;
      this.#names = enclosing.names.nest();
    } else {
      this.#shared = { uniques: new Map() };
      this.#names = new EsNameRegistry();
    }

    this.#comment = EsComment.from(comment);
  }

  /**
   * Always refers itself.
   */
  get ns(): this {
    return this;
  }

  /**
   * Code emission scope this namespace created for.
   */
  get scope(): EsScope {
    return this.#scope;
  }

  /**
   * Enclosing namespace, or `undefined` for top-level one.
   */
  get enclosing(): EsNamespace | undefined {
    return this.#enclosing;
  }

  /**
   * Name registry used to reserve names.
   */
  get names(): EsNameRegistry {
    return this.#names;
  }

  /**
   * Namespace comment.
   */
  get comment(): EsComment {
    return this.#comment;
  }

  /**
   * Checks whether this namespace encloses another one.
   *
   * @param ns - Namespace to checks.
   *
   * @returns `true` if the given namespace is {@link nest nested} within this namespace or any namespaces nested
   * within it, or `false` otherwise.
   */
  encloses(ns: EsNamespace): boolean {
    let target: EsNamespace | undefined = ns;

    while (target) {
      if (target === this) {
        return true;
      }

      target = target.enclosing;
    }

    return false;
  }

  /**
   * Registers `symbol` within namespace and assigns a name for it.
   *
   * The symbol will be {@link findSymbol visible} within namespace itself and its {@link nest nested} ones.
   *
   * Called by symbol declaration method.
   *
   * @typeParam TNaming - Type of symbol naming.
   * @param symbol - Symbol to bind.
   * @param createNaming - Naming factory function that accepts partial symbol naming.
   *
   * @returns Symbol naming.
   *
   * @throws [TypeError] if the `symbol` is already named within another namespace.
   *
   * [TypeError]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/TypeError
   */
  addSymbol<TNaming extends EsNaming>(
    symbol: EsSymbol<TNaming>,
    createNaming: (naming: EsNaming) => TNaming,
  ): TNaming {
    return symbol.isUnique()
      ? this.#addUniqueSymbol(symbol, createNaming)
      : this.#addNonUniqueSymbol(symbol, createNaming);
  }

  #addUniqueSymbol<TNaming extends EsNaming>(
    symbol: EsSymbol<TNaming>,
    createNaming: (naming: EsNaming) => TNaming,
  ): TNaming {
    const oldNaming = this.#shared.uniques.get(symbol) as TNaming | undefined;

    if (oldNaming) {
      return this.#throwInvisible(symbol, oldNaming);
    }

    const newNaming = this.#nameSymbol(symbol, createNaming);

    this.#shared.uniques.set(symbol, newNaming);

    return newNaming;
  }

  #addNonUniqueSymbol<TNaming extends EsNaming>(
    symbol: EsSymbol<TNaming>,
    createNaming: (naming: EsNaming) => TNaming,
  ): TNaming {
    const found = this.#findNonUniqueSymbol(symbol);

    if (found) {
      const {
        naming: { ns },
        visible,
      } = found;

      if (visible || this.encloses(ns)) {
        return this.#throwInvisible(symbol, found.naming);
      }
    }

    const naming = this.#nameSymbol(symbol, createNaming);

    this.#nonUniques.set(symbol, { naming, visible: true });
    this.#registerNestedNaming(symbol, naming);

    return naming;
  }

  #registerNestedNaming<TNaming extends EsNaming>(
    symbol: EsSymbol<TNaming>,
    naming: TNaming,
  ): void {
    const { enclosing } = this;

    if (enclosing && !enclosing.#nonUniques.has(symbol)) {
      enclosing.#nonUniques.set(symbol, { naming, visible: false });
      enclosing.#registerNestedNaming(symbol, naming);
    }
  }

  #throwInvisible(symbol: EsSymbol, naming: EsNaming): never {
    if (naming.ns === this) {
      throw new TypeError(`Can not rename ${symbol} in ${this}`);
    }

    throw new TypeError(
      `Can not assign new name to ${symbol} in ${this}. It is already named in ${naming.ns}`,
    );
  }

  #nameSymbol<TNaming extends EsNaming>(
    symbol: EsSymbol<TNaming>,
    createNaming: (naming: EsNaming) => TNaming,
  ): TNaming {
    const getName = lazyValue(() => this.names.reserveName(symbol.requestedName));

    return createNaming({
      symbol,
      ns: this,
      get name() {
        // Reserve the name lazily.
        // For example, when importing already imported symbol, the cached naming will be reused,
        // so reserving another name is redundant.
        return getName();
      },
      emit: getName,
    });
  }

  /**
   * Searches for the symbol {@link addSymbol named} in this namespace or one of enclosing namespaces.
   *
   * @typeParam TNaming - Type of symbol naming.
   * @param ref - Reference to target symbol.
   *
   * @returns Either found symbol naming, or `undefined` when `symbol` is not visible.
   */
  findSymbol<TNaming extends EsNaming>(ref: EsReference<TNaming>): TNaming | undefined;

  findSymbol<TNaming extends EsNaming>({ symbol }: EsReference<TNaming>): TNaming | undefined {
    if (symbol.isUnique()) {
      return this.#findUniqueSymbol(symbol);
    }

    const nonUnique = this.#findNonUniqueSymbol(symbol);

    return nonUnique?.visible ? nonUnique.naming : undefined;
  }

  #findUniqueSymbol<TNaming extends EsNaming>(symbol: EsSymbol<TNaming>): TNaming | undefined {
    const naming = this.#shared.uniques.get(symbol);

    return naming && (naming.ns.encloses(this) ? (naming as TNaming) : undefined);
  }

  #findNonUniqueSymbol<TNaming extends EsNaming>(
    symbol: EsSymbol<TNaming>,
  ): EsNonUniqueNaming<TNaming> | undefined {
    const found = this.#nonUniques.get(symbol) as EsNonUniqueNaming<TNaming> | undefined;

    if (found) {
      return found;
    }

    const { enclosing } = this;

    if (enclosing) {
      const found = enclosing.#findNonUniqueSymbol(symbol);

      if (found) {
        // Cache for future use.
        this.#nonUniques.set(symbol, found);

        return found;
      }
    }

    return;
  }

  /**
   * Refers the symbol visible in this namespace.
   *
   * @typeParam TNaming - Type of symbol naming.
   * @param ref - Reference to symbol previously named in this namespace or one of enclosing ones.
   *
   * @returns Referred symbol naming.
   */
  refer<TNaming extends EsNaming>(ref: EsReference<TNaming>): EsResolution<TNaming>;

  refer<TNaming extends EsNaming>({ symbol }: EsReference<TNaming>): EsResolution<TNaming> {
    const findNaming = symbol.isUnique()
      ? () => this.#findUniqueNaming(symbol)
      : () => this.#findNonUniqueNaming(symbol);
    const whenNamed = async (): Promise<TNaming> => await this.#whenNamed(symbol, findNaming);

    return symbol.refer(
      {
        symbol,
        getNaming: () => this.#getNaming(symbol, findNaming),
        whenNamed,
        async emit() {
          const { name } = await whenNamed();

          return name;
        },
      },
      this,
    );
  }

  #findUniqueNaming<TNaming extends EsNaming>(symbol: EsSymbol<TNaming>): TNaming | undefined {
    const naming = this.#shared.uniques.get(symbol) as TNaming | undefined;

    if (naming && !naming.ns.encloses(this)) {
      throw new ReferenceError(`${symbol} is invisible to ${this}. It is named in ${naming.ns}`);
    }

    return naming;
  }

  #findNonUniqueNaming<TNaming extends EsNaming>(symbol: EsSymbol<TNaming>): TNaming | undefined {
    const found = this.#findNonUniqueSymbol(symbol);

    if (!found) {
      return;
    }

    const { naming, visible } = found;

    return visible ? naming : undefined;
  }

  #getNaming<TNaming extends EsNaming>(
    symbol: EsSymbol<TNaming>,
    findNaming: () => TNaming | undefined,
  ): TNaming {
    const naming = findNaming();

    if (!naming) {
      if (!symbol.isUnique()) {
        const nonUnique = this.#findNonUniqueSymbol(symbol);

        if (nonUnique) {
          const { naming, visible } = nonUnique;

          if (!visible) {
            throw new ReferenceError(
              `${symbol} is invisible to ${this}. It is named in ${naming.ns}`,
            );
          }
        }
      }

      throw new ReferenceError(`${symbol} is unnamed`);
    }

    return naming;
  }

  async #whenNamed<TNaming extends EsNaming>(
    symbol: EsSymbol<TNaming>,
    findNaming: () => TNaming | undefined,
  ): Promise<TNaming> {
    // Try immediately
    const immediateNaming = findNaming();

    if (immediateNaming) {
      return immediateNaming;
    }

    // Try after pending promises resolution.
    await Promise.resolve();

    const pendingNaming = findNaming();

    if (pendingNaming) {
      return pendingNaming;
    }

    // Try after all promises resolution.
    await whenNextEvent();

    return this.#getNaming(symbol, findNaming);
  }

  /**
   * Creates nested namespace.
   *
   * @param scope - Code emission scope the nested namespace created for.
   * @param init - Nested namespace initialization options.
   *
   * @returns New namespace nested within current one.
   */
  nest(scope: EsScope, init?: Omit<EsNamespaceInit, 'enclosing'>): EsNamespace {
    return new EsNamespace(scope, { ...init, enclosing: this });
  }

  toString(): string {
    return this.comment.toString();
  }

}

/**
 * A host of symbol naming.
 */
export interface EsNamingHost {
  /**
   * Namespace used for symbol naming.
   */
  readonly ns: EsNamespace;
}

/**
 * Namespace initialization options.
 */
export interface EsNamespaceInit {
  /**
   * Human-readable namespace comment used in its string representation.
   */
  readonly comment?: EsComment | string | undefined;

  /**
   * Enclosing namespace. The constructed one is {@link EsNamespace#nest nested} within it.
   *
   * Unspecified for top-level namespace.
   */
  readonly enclosing?: EsNamespace | undefined;
}

let EsNamespace$seq = 0;

interface EsNamespace$SharedState {
  readonly uniques: Map<EsSymbol, EsNaming>;
}

interface EsNonUniqueNaming<TNaming extends EsNaming> {
  readonly naming: TNaming;
  readonly visible: boolean;
}
