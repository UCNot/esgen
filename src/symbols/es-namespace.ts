import { lazyValue } from '@proc7ts/primitives';
import { EsEmission } from '../emission/es-emission.js';
import { EsNameRegistry } from './es-name-registry.js';
import {
  EsAnySymbol,
  EsNaming,
  EsNamingConstraints,
  EsReference,
  EsResolution,
  EsSymbol,
} from './es-symbol.js';

/**
 * Namespace used to resolve naming conflicts.
 */
export class EsNamespace {

  readonly #emission: EsEmission;
  readonly #enclosing: EsNamespace | undefined;
  readonly #shared: EsNamespace$SharedState;
  readonly #names: EsNameRegistry;
  readonly #comment: string;
  readonly #nonUniques = new Map<EsAnySymbol, EsNonUniqueNaming<any>>();
  #nestedSeq = 0;

  /**
   * Constructs namespace.
   *
   * @param emission - Code emission control the namespace created for.
   * @param init - Initialization options.
   */
  constructor(emission: EsEmission, init?: EsNamespaceInit);

  constructor(
    emission: EsEmission,
    {
      enclosing,
      comment = enclosing
        ? `${enclosing}/${++enclosing.#nestedSeq}`
        : `Namespace #${++EsNamespace$seq}`,
    }: EsNamespaceInit = {},
  ) {
    this.#emission = emission;
    this.#enclosing = enclosing;
    if (enclosing) {
      this.#shared = enclosing.#shared;
      this.#names = enclosing.names.nest();
    } else {
      this.#shared = { uniques: new Map() };
      this.#names = new EsNameRegistry();
    }
    this.#comment = comment;
  }

  /**
   * Code emission control this namespace created for.
   */
  get emission(): EsEmission {
    return this.#emission;
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
   * Names the given `symbol` within namespace.
   *
   * The symbol will be {@link findSymbol visible} within namespace itself and its {@link nest nested} ones.
   *
   * @typeParam TNaming - Type of symbol naming.
   * @typeParam TConstraints - Type of naming constraints.
   * @param symbol - Symbol to bind.
   * @param constraints - Naming constraints.
   *
   * @returns Symbol naming.
   *
   * @throws [TypeError] if the `symbol` is already named within another namespace.
   *
   * [TypeError]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/TypeError
   */
  nameSymbol<TNaming extends EsNaming, TConstraints extends EsNamingConstraints>(
    symbol: EsSymbol<TNaming, TConstraints>,
    ...constraints: EsNamingConstraints extends TConstraints ? [TConstraints?] : [TConstraints]
  ): TNaming;

  nameSymbol<TNaming extends EsNaming, TConstraints extends EsNamingConstraints>(
    symbol: EsSymbol<TNaming, TConstraints>,
    constraints?: TConstraints,
  ): TNaming {
    return symbol.isUnique()
      ? this.#nameUniqueSymbol(symbol, constraints)
      : this.#nameNonUniqueSymbol(symbol, constraints);
  }

  #nameUniqueSymbol<TNaming extends EsNaming, TConstraints extends EsNamingConstraints>(
    symbol: EsSymbol<TNaming, TConstraints>,
    constraints?: TConstraints,
  ): TNaming {
    const oldNaming = this.#shared.uniques.get(symbol) as TNaming | undefined;

    if (oldNaming) {
      return this.#checkVisibility(symbol, oldNaming, constraints);
    }

    const newNaming = this.#bindSymbol(symbol, constraints);

    this.#shared.uniques.set(symbol, newNaming);

    return newNaming;
  }

  #nameNonUniqueSymbol<TNaming extends EsNaming, TConstraints extends EsNamingConstraints>(
    symbol: EsSymbol<TNaming, TConstraints>,
    constraints?: TConstraints,
  ): TNaming {
    const found = this.#findNonUniqueSymbol(symbol);

    if (found) {
      const {
        naming: { ns },
        visible,
      } = found;

      if (visible || this.encloses(ns)) {
        return this.#checkVisibility(symbol, found.naming, constraints);
      }
    }

    const naming = this.#bindSymbol(symbol, constraints);

    this.#nonUniques.set(symbol, { naming, visible: true });
    this.#registerNestedNaming(symbol, naming);

    return naming;
  }

  #registerNestedNaming<TNaming extends EsNaming>(
    symbol: EsAnySymbol<TNaming>,
    naming: TNaming,
  ): void {
    const { enclosing } = this;

    if (enclosing && !enclosing.#nonUniques.has(symbol)) {
      enclosing.#nonUniques.set(symbol, { naming, visible: false });
      enclosing.#registerNestedNaming(symbol, naming);
    }
  }

  #checkVisibility<TNaming extends EsNaming, TConstraints extends EsNamingConstraints>(
    symbol: EsSymbol<TNaming, TConstraints>,
    naming: TNaming,
    constraints: TConstraints | undefined,
  ): TNaming {
    if (naming.ns === this) {
      // Already names in this namespace.
      if (constraints?.requireNew) {
        throw new TypeError(`Can not rename ${symbol} in ${this}`);
      }

      return naming;
    }

    throw new TypeError(
      `Can not assign new name to ${symbol} in ${this}. It is already named in ${naming.ns}`,
    );
  }

  #bindSymbol<TNaming extends EsNaming, TConstraints extends EsNamingConstraints>(
    symbol: EsSymbol<TNaming, TConstraints>,
    constraints: TConstraints | undefined,
  ): TNaming {
    const getName = lazyValue(() => this.names.reserveName(symbol.requestedName));

    return symbol.bind(
      {
        symbol,
        ns: this,
        get name() {
          // Reserve the name lazily.
          // For example, when importing already imported symbol, the cached naming will be reused,
          // so reserving another name is redundant.
          return getName();
        },
        emit: getName,
      },
      constraints!,
    );
  }

  /**
   * Searches for the symbol {@link nameSymbol named} in this namespace or one of enclosing namespaces.
   *
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

  #findUniqueSymbol<TNaming extends EsNaming>(symbol: EsAnySymbol<TNaming>): TNaming | undefined {
    const naming = this.#shared.uniques.get(symbol);

    return naming && (naming.ns.encloses(this) ? (naming as TNaming) : undefined);
  }

  #findNonUniqueSymbol<TNaming extends EsNaming>(
    symbol: EsAnySymbol<TNaming>,
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

  #findUniqueNaming<TNaming extends EsNaming>(symbol: EsAnySymbol<TNaming>): TNaming | undefined {
    const naming = this.#shared.uniques.get(symbol) as TNaming | undefined;

    if (naming && !naming.ns.encloses(this)) {
      throw new ReferenceError(`${symbol} is invisible to ${this}. It is named in ${naming.ns}`);
    }

    return naming;
  }

  #findNonUniqueNaming<TNaming extends EsNaming>(
    symbol: EsAnySymbol<TNaming>,
  ): TNaming | undefined {
    const found = this.#findNonUniqueSymbol(symbol);

    if (!found) {
      return;
    }

    const { naming, visible } = found;

    if (!visible) {
      throw new ReferenceError(`${symbol} is invisible to ${this}. It is named in ${naming.ns}`);
    }

    return naming;
  }

  #getNaming<TNaming extends EsNaming>(
    symbol: EsAnySymbol<TNaming>,
    findNaming: () => TNaming | undefined,
  ): TNaming {
    const naming = findNaming();

    if (!naming) {
      throw new ReferenceError(`${symbol} is unnamed`);
    }

    return naming;
  }

  async #whenNamed<TNaming extends EsNaming>(
    symbol: EsAnySymbol<TNaming>,
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
    await new Promise(resolve => {
      setImmediate(resolve);
    });

    return this.#getNaming(symbol, findNaming);
  }

  /**
   * Creates nested namespace.
   *
   * @param emission - Code emission control the nested namespace created for.
   * @param init - Nested namespace initialization options.
   *
   * @returns New namespace nested within current one.
   */
  nest(emission: EsEmission, init?: Omit<EsNamespaceInit, 'enclosing'>): EsNamespace {
    return new EsNamespace(emission, { ...init, enclosing: this });
  }

  toString(): string {
    return `/* ${this.#comment} */`;
  }

}

/**
 * Namespace initialization options.
 */
export interface EsNamespaceInit {
  /**
   * Arbitrary human-readable comment.
   *
   * Used as for string representation of namespace.
   */
  readonly comment?: string | undefined;

  /**
   * Enclosing namespace. The constructed one is {@link EsNamespace#nest nested} within it.
   *
   * Unspecified for top-level namespace.
   */
  readonly enclosing?: EsNamespace | undefined;
}

let EsNamespace$seq = 0;

interface EsNamespace$SharedState {
  readonly uniques: Map<EsAnySymbol, EsNaming>;
}

interface EsNonUniqueNaming<TNaming extends EsNaming> {
  readonly naming: TNaming;
  readonly visible: boolean;
}
