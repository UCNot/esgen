import { jsStringLiteral } from 'httongue';
import { EsEmission, EsEmitter } from '../emission/es-emission.js';
import { EsNamespace } from './es-namespace.js';

/**
 * Program symbol.
 *
 * Requests a {@link requestedName name} within program. The actual name, however, may differ to avoid naming conflicts.
 * In order to receive an actual name, the symbol has to be {@link EsNamespace#bindSymbol bound} to namespace. Then
 * the symbol becomes {@link EsNamespace#findSymbol visible} under its actual {@link EsNamespace#symbolName name} within
 * target namespace and its nested namespaces.
 *
 * @typeParam TBinding - Type of symbol bindings.
 * @typeParam TBindRequest - Type of binding request.
 */
export abstract class EsSymbol<
  out TBinding extends EsSymbol.Binding = EsSymbol.Binding,
  in TBindRequest = void,
> implements EsEmitter {

  readonly #requestedName: string;
  readonly #comment: string | undefined;

  /**
   * Constructs symbol.
   *
   * @param requestedName - Requested symbol name. Make sure this is a valid ECMAScript name.
   * @param init - Initialization options.
   */
  constructor(requestedName: string, init?: EsSymbol.Init) {
    this.#requestedName = requestedName;
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
   * Performs symbol binding.
   *
   * Called by {@link EsNamespace#bindSymbol namespace} during emission to actually bind the symbol to namespace.
   *
   * @param binding - Symbol binding information.
   * @param request - Binding request specific to this type of symbols.
   *
   * @returns Symbol binding specific to this type of symbols.
   */
  abstract bind(binding: EsSymbol.Binding, request: TBindRequest): TBinding;

  /**
   * Emits the name of the symbol visible to {@link EsEmission#ns emission namespace}.
   *
   * @param emission - Code emission control.
   *
   * @returns Emission result.
   */
  emit(emission: EsEmission): EsEmission.Result {
    return emission.ns.symbolName(this);
  }

  toString(): string {
    const { requestedName, comment } = this;

    return `Symbol ${jsStringLiteral(requestedName, '"')}` + (comment ? ` /* ${comment} */` : '');
  }

}

export namespace EsSymbol {
  /**
   * Arbitrary symbol.
   *
   * @typeParam TBinding - Type of symbol binding.
   */
  export type Any<TBinding extends EsSymbol.Binding = EsSymbol.Binding> = EsSymbol<TBinding, any>;

  /**
   * Symbol initialization options.
   */
  export interface Init {
    /**
     * Human-readable symbol comment used in its string representation.
     */
    readonly comment?: string | undefined;
  }

  /**
   * Information on symbol {@link EsNamespace#findSymbol binding} to namespace.
   */
  export interface Binding {
    /**
     * Namespace the symbol is bound to.
     */
    readonly ns: EsNamespace;

    /**
     * The name used to refer the symbol.
     */
    readonly name: string;
  }
}
