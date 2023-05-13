import { asArray } from '@proc7ts/primitives';
import { EsBundle } from '../emission/es-bundle.js';
import { EsEmission, EsEmissionResult } from '../emission/es-emission.js';
import { EsSource } from '../es-source.js';
import { EsAnySymbol, EsNaming, EsSymbol, EsSymbolInit } from '../symbols/es-symbol.js';

/**
 * Symbol declared in bundle {@link EsDeclarations declarations}.
 *
 * The symbol is automatically declared and named in {@link EsBundle#ns bundle namespace} whenever used.
 */
export class EsDeclaredSymbol extends EsSymbol {

  readonly #exported: boolean;
  readonly #refers: readonly EsAnySymbol[];
  readonly #declare: (context: EsDeclarationContext) => EsSource;

  /**
   * Constructs declared symbol.
   *
   * @param requestedName - Requested symbol name. Make sure this is a valid ECMAScript name.
   * @param init - Declaration initialization options.
   */
  constructor(requestedName: string, init: EsDeclarationInit) {
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

  override bind(naming: EsNaming): EsNaming {
    return naming.ns.emission.declarations.addDeclaration(this, naming);
  }

  override emit(emission: EsEmission): EsEmissionResult {
    return emission.bundle.ns.nameSymbol(this).name;
  }

  /**
   * Declares the symbol.
   *
   * Called on demand, at most once per bundle.
   *
   * @param context - Declaration context.
   *
   * @returns Source of code that contains declaration.
   */
  declare(context: EsDeclarationContext): EsSource {
    return code => {
      for (const ref of this.#refers) {
        context.refer(ref);
      }
      code.write(this.#declare(context));
    };
  }

}

/**
 * Declaration initialization options.
 */
export interface EsDeclarationInit extends EsSymbolInit {
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
  readonly refers?: EsAnySymbol | readonly EsAnySymbol[] | undefined;

  /**
   * Declares the symbol.
   *
   * Called on demand, at most once per bundle.
   *
   * @param context - Declaration context.
   *
   * @returns Source of code that contains declaration.
   */
  declare(this: void, context: EsDeclarationContext): EsSource;
}

/**
 * Declaration context.
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
  refer(this: void, ref: EsAnySymbol): void;
}
