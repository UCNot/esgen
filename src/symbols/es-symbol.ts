import { jsStringLiteral } from 'httongue';
import { EsEmission, EsEmissionResult, EsEmitter } from '../emission/es-emission.js';
import { safeJsId } from '../impl/safe-js-id.js';
import { EsNamespace } from './es-namespace.js';

/**
 * Program symbol.
 *
 * Requests a {@link requestedName name} within program. The actual name, however, may differ to avoid naming conflicts.
 * In order to receive an actual name, the symbol has to be {@link EsNamespace#nameSymbol named} first. Then, the symbol
 * becomes {@link EsNamespace#findSymbol visible} under its actual {@link EsNamespace#symbolName name} in target
 * namespace and its nested namespaces.
 *
 * @typeParam TNaming - Type of symbol naming.
 * @typeParam TConstraints - Type of naming constraints.
 */
export abstract class EsSymbol<
  out TNaming extends EsNaming = EsNaming,
  in TConstraints extends EsNamingConstraints = EsNamingConstraints,
> implements EsEmitter {

  readonly #requestedName: string;
  readonly #comment: string | undefined;

  /**
   * Constructs symbol.
   *
   * @param requestedName - Requested symbol name.
   * @param init - Initialization options.
   */
  constructor(requestedName: string, init?: EsSymbolInit) {
    this.#requestedName = safeJsId(requestedName);
    this.#comment = init?.comment;
  }

  /**
   * Requested symbol name.
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
   * Whether this is a unique symbol.
   *
   * Non-unique symbols may be named multiple times in unrelated namespaces.
   *
   * @defaultValue `true`.
   */
  isUnique(): boolean {
    return true;
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
    return emission.ns.symbolName(this);
  }

  toString(): string {
    const { requestedName, comment } = this;

    return `Symbol ${jsStringLiteral(requestedName, '"')}` + (comment ? ` /* ${comment} */` : '');
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
 * Information on symbol {@link EsNamespace#findSymbol naming} within namespace.
 */
export interface EsNaming {
  /**
   * Namespace the symbol is visible in.
   */
  readonly ns: EsNamespace;

  /**
   * The name used to refer the symbol.
   */
  readonly name: string;
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
