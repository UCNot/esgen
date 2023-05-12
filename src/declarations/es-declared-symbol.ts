import { asArray } from '@proc7ts/primitives';
import { EsBundle } from '../emission/es-bundle.js';
import { EsEmission } from '../emission/es-emission.js';
import { EsSource } from '../es-source.js';
import { EsSymbol } from '../symbols/es-symbol.js';

/**
 * Symbol declared in bundle {@link EsDeclarations declarations}.
 *
 * The symbol is automatically declared and bound to {@link EsBundle#ns top-level bundle namespace} whenever used.
 */
export class EsDeclaredSymbol extends EsSymbol {

  readonly #exported: boolean;
  readonly #refers: readonly EsSymbol.Any[];
  readonly #declare: (declarer: EsDeclaredSymbol.Declarer) => EsSource;

  /**
   * Constructs declared symbol.
   *
   * @param requestedName - Requested symbol name. Make sure this is a valid ECMAScript name.
   * @param init - Declaration initialization options.
   */
  constructor(requestedName: string, init: EsDeclaredSymbol.Init) {
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

  override bind(binding: EsSymbol.Binding): EsSymbol.Binding {
    return binding.ns.emission.declarations.addDeclaration(this, binding);
  }

  override emit(emission: EsEmission): EsEmission.Result {
    return emission.bundle.ns.bindSymbol(this).name;
  }

  /**
   * Declares the symbol.
   *
   * Called on demand, at most once per bundle.
   *
   * @param declarer - Symbol declarer context.
   *
   * @returns Source of code that contains declaration.
   */
  declare(declarer: EsDeclaredSymbol.Declarer): EsSource {
    return code => {
      for (const ref of this.#refers) {
        declarer.refer(ref);
      }
      code.write(this.#declare(declarer));
    };
  }

}

export namespace EsDeclaredSymbol {
  /**
   * Declaration initialization options.
   */
  export interface Init extends EsSymbol.Init {
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
    readonly refers?: EsSymbol.Any | readonly EsSymbol.Any[] | undefined;

    /**
     * Declares the symbol.
     *
     * Called on demand, at most once per bundle.
     *
     * @param declarer - Symbol declarer context.
     *
     * @returns Source of code that contains declaration.
     */
    declare(this: void, declarer: Declarer): EsSource;
  }

  /**
   * Constant initialization options.
   */
  export interface ConstInit extends Omit<Init, 'declare'> {
    /**
     * Constant name prefix.
     *
     * @defaultValue `'CONST_'`, unless constant exported.
     */
    readonly prefix?: string | undefined;
  }

  /**
   * Symbol declarer context.
   */
  export interface Declarer {
    /**
     * Binding of declares symbol.
     */
    readonly binding: EsSymbol.Binding;

    /**
     * Refers the given symbol.
     *
     * Referred symbols supposed to be declared _before_ the referrer.
     *
     * @param ref - Referred symbol.
     */
    refer(this: void, ref: EsSymbol.Any): void;
  }
}
