import { EsSymbol } from './es-symbol.js';

/**
 * Namespace used to resolve naming conflicts.
 */
export class EsNamespace {

  readonly #shared: EsNamespace$SharedState;
  readonly #enclosing: EsNamespace | undefined;
  readonly #comment: string;
  readonly #names = new Map<string, UsNames>();
  #nestedSeq = 0;

  /**
   * Constructs namespace.
   *
   * @param init - Initialization options.
   */
  constructor(init?: EsNamespace.Init);

  constructor({
    enclosing,
    comment = enclosing
      ? `${enclosing}/${++enclosing.#nestedSeq}`
      : `Namespace #${++EsNamespace$seq}`,
  }: EsNamespace.Init = {}) {
    this.#shared = enclosing ? enclosing.#shared : { bindings: new Map() };
    this.#enclosing = enclosing;
    this.#comment = comment;
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
   * Binds the given `symbol` to this namespace.
   *
   * The symbol will be {@link findSymbol visible} within namespace itself and its {@link nest nested} ones.
   *
   * @param symbol - Symbol to bind.
   *
   * @returns The name used to refer the symbol.
   *
   * @throws [TypeError] if the `symbol` is bound to another namespace already.
   *
   * [TypeError]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypeError
   */
  bindSymbol(symbol: EsSymbol): string {
    const binding = this.#shared.bindings.get(symbol);

    if (binding) {
      if (binding.ns === this) {
        // Already bound to this namespace.
        return binding.name;
      }

      throw new TypeError(
        `Can not bind ${symbol} to ${this}. It is already bound to ${binding.ns}`,
      );
    }

    const name = this.name(symbol.requestedName);

    this.#shared.bindings.set(symbol, { ns: this, name });

    return name;
  }

  /**
   * Searches for the `symbol` {@link bindSymbol binding} to this namespace or its parent.
   *
   * @param symbol - Target symbol.
   *
   * @returns Either found binding, or `undefined` when `symbol` is not visible.
   */
  findSymbol(symbol: EsSymbol): EsSymbol.Binding | undefined {
    const binding = this.#shared.bindings.get(symbol);

    return binding && (binding.ns.encloses(this) ? binding : undefined);
  }

  /**
   * Obtains a name used to refer the `symbol` visible within this namespace.
   *
   * @param symbol - Target symbol previously bound to this namespace or one of enclosing ones.
   *
   * @throws [ReferenceError] if symbol unbound or not visible within this namespace.
   *
   * [ReferenceError]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ReferenceError
   */
  symbolName(symbol: EsSymbol): string {
    const binding = this.#shared.bindings.get(symbol);

    if (!binding) {
      throw new ReferenceError(`${symbol} is unbound`);
    }
    if (!binding.ns.encloses(this)) {
      throw new ReferenceError(
        `${symbol} is not visible within ${this}. It is bound to ${binding.ns}`,
      );
    }

    return binding.name;
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
  name(preferred = 'tmp'): string {
    return this.#name(preferred, false);
  }

  #name(preferred: string, forNested: boolean): string {
    if (forNested) {
      const names = this.#names.get(preferred);

      if (names?.nested) {
        return names.nested;
      }
    }

    if (this.#enclosing) {
      const names = this.#names.get(preferred);
      const name = this.#reserveName(
        this.#enclosing.#name(names ? this.#nextName(names) : preferred, true),
        forNested,
      );

      if (names && name !== preferred) {
        this.#addAlias(names, name, forNested);
      }

      return name;
    }

    return this.#reserveName(preferred, forNested);
  }

  #reserveName(preferred: string, forNested: boolean): string {
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

  #addAlias(names: UsNames, alias: string, forNested: boolean): void {
    names.list.push(alias);
    if (forNested && !names.nested) {
      names.nested = alias;
    }
  }

  #nextName({ list }: UsNames): string {
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
   * @param init - Nested namespace initialization options.
   *
   * @returns New namespace nested within current one.
   */
  nest(init?: Omit<EsNamespace.Init, 'enclosing'>): EsNamespace {
    return new EsNamespace({ ...init, enclosing: this });
  }

  toString(): string {
    return `/* ${this.#comment} */`;
  }

}

export namespace EsNamespace {
  /**
   * Namespace initialization options.
   */
  export interface Init {
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
}

let EsNamespace$seq = 0;

interface UsNames {
  readonly list: string[];
  nested: string | undefined;
}

interface EsNamespace$SharedState {
  readonly bindings: Map<EsSymbol, EsSymbol.Binding>;
}
