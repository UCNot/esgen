import { EsEmission, EsEmissionResult, EsEmitter } from '../emission/es-emission.js';
import { EsCode } from '../es-code.js';
import { EsProducer, EsSource } from '../es-source.js';
import { esSafeId } from '../util/es-safe-id.js';
import { EsNamespace } from './es-namespace.js';
import { esSymbolString } from './es-symbol-string.js';

/**
 * Program symbol.
 *
 * Requests a {@link requestedName name} within program. The actual name, however, may differ to avoid naming conflicts.
 * In order to receive an actual name, the symbol has to be {@link EsNamespace#nameSymbol named} first. Then, the symbol
 * becomes {@link EsNamespace#findSymbol visible} under its actual {@link EsNamespace#refer name} in target
 * namespace and its nested namespaces.
 *
 * @typeParam TNaming - Type of symbol naming.
 * @typeParam TConstraints - Type of naming constraints.
 */
export abstract class EsSymbol<
  out TNaming extends EsNaming = EsNaming,
  in TConstraints extends EsNamingConstraints = EsNamingConstraints,
> implements EsReference<TNaming>, EsEmitter {

  readonly #requestedName: string;
  readonly #comment: string | undefined;

  /**
   * Constructs symbol.
   *
   * @param requestedName - Requested symbol name. Will be converted to {@link esSafeId ECMAScript-safe} identifier.
   * @param init - Initialization options.
   */
  constructor(requestedName: string, init?: EsSymbolInit) {
    this.#requestedName = esSafeId(requestedName);
    this.#comment = init?.comment;
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
   * Does nothing by default.
   *
   * @param resolution - Symbol resolution.
   * @param ns - Referring namespace.
   *
   * @returns Adjusted resolution.
   */
  refer(resolution: EsResolution<TNaming, this>, ns: EsNamespace): EsResolution<TNaming, this>;
  refer(resolution: EsResolution<TNaming, this>, _ns: EsNamespace): EsResolution<TNaming, this> {
    return resolution;
  }

  /**
   * Binds named symbol to namespace.
   *
   * Called to perform additional actions right after the symbol received its {@link EsNamespace#nameSymbol name}.
   *
   * @param naming - Symbol naming.
   * @param constraints - Naming constraints specific to this type of symbols.
   *
   * @returns Naming specific to this type of symbols.
   */
  abstract bind(naming: EsNaming, constraints: TConstraints): TNaming;

  /**
   * Emits the name of the symbol visible to {@link EsEmission#ns emission namespace}.
   *
   * @param emission - Code emission control.
   *
   * @returns Emission result.
   */
  emit(emission: EsEmission): EsEmissionResult {
    return new EsCode().write(emission.ns.refer<TNaming>(this)).emit(emission);
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
 * Arbitrary symbol type suitable for wildcard usage.
 *
 * @typeParam TNaming - Type of symbol naming.
 */
export type EsAnySymbol<TNaming extends EsNaming = EsNaming> = EsSymbol<TNaming, any>;

/**
 * Symbol initialization options.
 */
export interface EsSymbolInit {
  /**
   * Human-readable symbol comment used in its string representation.
   */
  readonly comment?: string | undefined;
}

/**
 * Symbol reference.
 *
 * @typeParam TNaming - Type of symbol naming.
 * @typeParam TSymbol - Type of symbol.
 */
export interface EsReference<
  out TNaming extends EsNaming = EsNaming,
  out TSymbol extends EsAnySymbol<TNaming> = EsAnySymbol<TNaming>,
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
  out TSymbol extends EsAnySymbol<TNaming> = EsAnySymbol<TNaming>,
> extends EsReference<TNaming, TSymbol>,
    EsEmitter {
  /**
   * Referred symbol.
   */
  readonly symbol: TSymbol;

  /**
   * Obtains immediately available {@link EsNamespace#nameSymbol naming} of the {@link symbol}.
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
   * Awaits for the {@link symbol} {@link EsNamespace#nameSymbol naming}.
   *
   * The naming may not be {@link getNaming immediately available}. This method allows to wait for it.
   *
   * This method won't wait infinitely and would fail if the symbol is not named for some time.
   *
   * @returns Promise resolved to symbol naming, or rejected if symbol is not named after some timeout.
   */
  whenNamed(): Promise<TNaming>;

  /**
   * Emits the code containing {@link symbol} name.
   *
   * @returns Code emission result.
   */
  emit(this: void): EsEmissionResult;
}

/**
 * Information on symbol {@link EsNamespace#findSymbol naming} within namespace.
 */
export interface EsNaming extends EsProducer {
  /**
   * Named symbol
   */
  readonly symbol: EsAnySymbol;

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
   * @returns Source of code containing symbol name.
   */
  toCode(this: void): EsSource;
}

/**
 * Basic symbol {@link EsNamespace#nameSymbol naming} constraints.
 */
export interface EsNamingConstraints {
  /**
   * Whether new name required.
   *
   * By default, if symbol already named within namespace, then existing naming will be reused. But when this flag set
   * to `true`, then error will be thrown in the above situation.
   *
   * @defaultValue `false`
   */
  readonly requireNew?: boolean | undefined;
}
