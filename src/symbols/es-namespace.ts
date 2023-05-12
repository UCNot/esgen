import { EsEmission } from '../emission/es-emission.js';
import { EsSymbol } from './es-symbol.js';

/**
 * Namespace used to resolve naming conflicts.
 */
export class EsNamespace {

  readonly #emission: EsEmission;
  readonly #shared: EsNamespace$SharedState;
  readonly #enclosing: EsNamespace | undefined;
  readonly #comment: string;
  readonly #names = new Map<string, EsNames>();
  #nestedSeq = 0;

  /**
   * Constructs namespace.
   *
   * @param emission - Code emission control the namespace created for.
   * @param init - Initialization options.
   */
  constructor(emission: EsEmission, init?: EsNamespace.Init);

  constructor(
    emission: EsEmission,
    {
      enclosing,
      comment = enclosing
        ? `${enclosing}/${++enclosing.#nestedSeq}`
        : `Namespace #${++EsNamespace$seq}`,
    }: EsNamespace.Init = {},
  ) {
    this.#emission = emission;
    this.#shared = enclosing ? enclosing.#shared : { bindings: new Map() };
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
   * Binds the given `symbol` to this namespace.
   *
   * The symbol will be {@link findSymbol visible} within namespace itself and its {@link nest nested} ones.
   *
   * @param symbol - Symbol to bind.
   *
   * @returns Symbol binding.
   *
   * @throws [TypeError] if the `symbol` is bound to another namespace already.
   *
   * [TypeError]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypeError
   */
  bindSymbol<TBinding extends EsSymbol.Binding>(symbol: EsSymbol<TBinding>): TBinding;

  /**
   * Binds the given `symbol` to this namespace with the given binding `request`.
   *
   * The symbol will be {@link findSymbol visible} within namespace itself and its {@link nest nested} ones.
   *
   * @param symbol - Symbol to bind.
   * @param request - Binding request.
   *
   * @returns Symbol binding.
   *
   * @throws [TypeError] if the `symbol` is bound to another namespace already.
   *
   * [TypeError]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypeError
   */
  bindSymbol<TBinding extends EsSymbol.Binding, TBindRequest>(
    symbol: EsSymbol<TBinding, TBindRequest>,
    request: TBindRequest,
  ): TBinding;

  bindSymbol<TBinding extends EsSymbol.Binding, TBindRequest>(
    symbol: EsSymbol<TBinding, TBindRequest>,
    request?: TBindRequest,
  ): TBinding {
    const existingBinding = this.#shared.bindings.get(symbol);

    if (existingBinding) {
      if (existingBinding.ns === this) {
        // Already bound to this namespace.
        return existingBinding as TBinding;
      }

      throw new TypeError(
        `Can not bind ${symbol} to ${this}. It is already bound to ${existingBinding.ns}`,
      );
    }

    const name = this.name(symbol.requestedName);
    const newBinding = symbol.bind({ ns: this, name }, request as TBindRequest);

    this.#shared.bindings.set(symbol, newBinding);

    return newBinding;
  }

  /**
   * Searches for the `symbol` {@link bindSymbol binding} to this namespace or its parent.
   *
   * @param symbol - Target symbol.
   *
   * @returns Either found binding, or `undefined` when `symbol` is not visible.
   */
  findSymbol<TBinding extends EsSymbol.Binding>(
    symbol: EsSymbol.Any<TBinding>,
  ): TBinding | undefined {
    const binding = this.#shared.bindings.get(symbol);

    return binding && (binding.ns.encloses(this) ? (binding as TBinding) : undefined);
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
  symbolName(symbol: EsSymbol.Any): string {
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

  #addAlias(names: EsNames, alias: string, forNested: boolean): void {
    names.list.push(alias);
    if (forNested && !names.nested) {
      names.nested = alias;
    }
  }

  #nextName({ list }: EsNames): string {
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
  nest(emission: EsEmission, init?: Omit<EsNamespace.Init, 'enclosing'>): EsNamespace {
    return new EsNamespace(emission, { ...init, enclosing: this });
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

interface EsNames {
  readonly list: string[];
  nested: string | undefined;
}

interface EsNamespace$SharedState {
  readonly bindings: Map<EsSymbol.Any, EsSymbol.Binding>;
}
