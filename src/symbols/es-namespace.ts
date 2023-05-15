import { lazyValue } from '@proc7ts/primitives';
import { EsEmission } from '../emission/es-emission.js';
import { EsAnySymbol, EsNaming, EsNamingConstraints, EsSymbol } from './es-symbol.js';

/**
 * Namespace used to resolve naming conflicts.
 */
export class EsNamespace {

  readonly #emission: EsEmission;
  readonly #shared: EsNamespace$SharedState;
  readonly #enclosing: EsNamespace | undefined;
  readonly #comment: string;
  readonly #names = new Map<string, EsReservedNames>();
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
    this.#shared = enclosing ? enclosing.#shared : { uniques: new Map() };
    this.#enclosing = enclosing;
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
   * [TypeError]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypeError
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
    const getName = lazyValue(() => this.reserveName(symbol.requestedName));

    return symbol.bind(
      {
        ns: this,
        get name() {
          // Reserve the name lazily.
          // For example, when importing already imported symbol, the cached naming will be reused,
          // so reserving another name is redundant.
          return getName();
        },
      },
      constraints!,
    );
  }

  /**
   * Searches for the `symbol` {@link nameSymbol named} in this namespace or one of enclosing namespaces.
   *
   * @param symbol - Target symbol.
   *
   * @returns Either found symbol naming, or `undefined` when `symbol` is not visible.
   */
  findSymbol<TNaming extends EsNaming>(symbol: EsAnySymbol<TNaming>): TNaming | undefined {
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
   * Obtains a name used to refer the `symbol` visible in this namespace.
   *
   * @param symbol - Target symbol previously named in this namespace or one of enclosing ones.
   *
   * @throws [ReferenceError] if symbol is unnamed or invisible to this namespace.
   *
   * [ReferenceError]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ReferenceError
   */
  symbolName(symbol: EsAnySymbol): string {
    return symbol.isUnique() ? this.#uniqueSymbolName(symbol) : this.#nonUniqueSymbolName(symbol);
  }

  #uniqueSymbolName(symbol: EsAnySymbol): string {
    const naming = this.#shared.uniques.get(symbol);

    if (!naming) {
      throw new ReferenceError(`${symbol} is unnamed`);
    }
    if (!naming.ns.encloses(this)) {
      throw new ReferenceError(`${symbol} is invisible to ${this}. It is named in ${naming.ns}`);
    }

    return naming.name;
  }

  #nonUniqueSymbolName(symbol: EsAnySymbol): string {
    const found = this.#findNonUniqueSymbol(symbol);

    if (!found) {
      throw new ReferenceError(`${symbol} is unnamed`);
    }

    const { naming, visible } = found;

    if (!visible) {
      throw new ReferenceError(`${symbol} is invisible to ${this}. It is named in ${naming.ns}`);
    }

    return naming.name;
  }

  /**
   * Reserves name and resolves naming conflicts.
   *
   * Tries to use `preferred` name. But if this name registered already, then appends unique suffix to it to resolve
   * the conflict.
   *
   * @param preferred - Preferred name. Defaults to `tmp`.
   *
   * @returns Reserved and conflict-free name based on `preferred` one.
   */
  reserveName(preferred = 'tmp'): string {
    return this.#reserveName(preferred, false);
  }

  #reserveName(preferred: string, forNested: boolean): string {
    if (forNested) {
      const names = this.#names.get(preferred);

      if (names?.nested) {
        return names.nested;
      }
    }

    if (this.#enclosing) {
      const names = this.#names.get(preferred);
      const name = this.#saveName(
        this.#enclosing.#reserveName(names ? this.#nextName(names) : preferred, true),
        forNested,
      );

      if (names && name !== preferred) {
        this.#addAlias(names, name, forNested);
      }

      return name;
    }

    return this.#saveName(preferred, forNested);
  }

  #saveName(preferred: string, forNested: boolean): string {
    const names = this.#names.get(preferred);
    let name: string;

    if (names) {
      name = this.#nextName(names);
      this.#addAlias(names, name, forNested);
    } else {
      name = preferred;
    }

    this.#names.set(name, { list: [name], nested: forNested ? name : undefined });

    return name;
  }

  #addAlias(names: EsReservedNames, alias: string, forNested: boolean): void {
    names.list.push(alias);
    if (forNested && !names.nested) {
      names.nested = alias;
    }
  }

  #nextName({ list }: EsReservedNames): string {
    const lastName = list[list.length - 1];
    const dollarIdx = lastName.lastIndexOf('$');
    const lastIndex = dollarIdx < 0 ? NaN : Number(lastName.slice(dollarIdx + 1));
    let name: string;

    if (Number.isFinite(lastIndex)) {
      name = `${lastName.slice(0, dollarIdx)}$${lastIndex + 1}`;
    } else {
      name = `${lastName}$0`;
    }

    const conflict = this.#names.get(name);

    return conflict ? this.#nextName(conflict) : name;
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

interface EsReservedNames {
  readonly list: string[];
  nested: string | undefined;
}

interface EsNamespace$SharedState {
  readonly uniques: Map<EsAnySymbol, EsNaming>;
}

interface EsNonUniqueNaming<TNaming extends EsNaming> {
  readonly naming: TNaming;
  readonly visible: boolean;
}