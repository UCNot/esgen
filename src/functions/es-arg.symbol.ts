import { lazyValue } from '@proc7ts/primitives';
import { EsSource } from '../es-source.js';
import { esline } from '../esline.tag.js';
import { esSymbolString } from '../symbols/es-symbol-string.js';
import { EsNaming, EsNamingConstraints, EsSymbol, EsSymbolInit } from '../symbols/es-symbol.js';
import { EsSignature } from './es-signature.js';

/**
 * Function argument symbol.
 *
 * Declared by {@link EsSignature#args function signature} typically.
 */
export class EsArgSymbol extends EsSymbol<EsArgNaming, EsArgNamingConstraints> {

  readonly #signature: EsSignature;
  readonly #position: number;
  readonly #kind: EsArgKind;

  /**
   * Constructs argument symbol.
   *
   * @param signature - Declaring signature.
   * @param requestedName - Requested argument name.
   * @param init - Argument initialization options.
   */
  constructor(signature: EsSignature, requestedName: string, init: EsArgInit) {
    super(requestedName, init);

    const { position, kind = EsArgKind.Required } = init;

    this.#signature = signature;
    this.#position = position;
    this.#kind = kind;
  }

  /**
   * Function signature declaring this symbol.
   */
  get signature(): EsSignature {
    return this.#signature;
  }

  /**
   * Argument position within signature.
   *
   * Reflects the order inside {@link EsSignature.Args signature arguments definition}. Note however, that
   * {@link EsArgKind.Optional optional} arguments always follow {@link EsArgKind.Required required} ones,
   * and {@link EsArgKind.VarArg vararg} argument is always last.
   */
  get position(): number {
    return this.#position;
  }

  get kind(): EsArgKind {
    return this.#kind;
  }

  /**
   * @returns `false`, as multiple functions may have the same signature with the same set of argument symbols.
   */
  override isUnique(): boolean {
    return false;
  }

  override bind(naming: EsNaming, constraints: EsArgNamingConstraints): EsArgNaming {
    return {
      ...naming,
      symbol: this,
      asDeclaration: lazyValue(() => {
        const { comment } = this;
        const { declare = this.#declareArgName() } = constraints;
        const commentCode = comment ? ` /* ${comment} */` : '';

        return esline`${declare(naming, this)}${commentCode}`;
      }),
    };
  }

  #declareArgName(): Exclude<EsArgNamingConstraints['declare'], undefined> {
    const { kind } = this;

    return kind === 'vararg' ? ({ name }) => `...${name}` : ({ name }) => name;
  }

  /**
   * Declares argument.
   *
   * Called from {@link EsSignature#declare signature declaration}.
   *
   * @param declaration - Custom argument declaration, if any.
   *
   * @returns Source of code containing argument declaration.
   */
  declare(declaration: EsArg.Declaration = {}): EsSource {
    return (code, emission) => {
      code.inline(
        emission.ns.nameSymbol(this, { ...declaration, requireNew: true }).asDeclaration(),
      );
    };
  }

  /**
   * @param tag - Symbol tag to include. Defaults to `[Arg #${position}]`.
   */
  override toString({
    tag = `[Arg #${this.position}]`,
    comment = this.comment,
  }: {
    readonly tag?: string | null | undefined;
    readonly comment?: string | null | undefined;
  } = {}): string {
    const { kind, requestedName } = this;
    let name: string;

    switch (kind) {
      case EsArgKind.Required:
        name = requestedName;

        break;
      case EsArgKind.Optional:
        name = `${requestedName}?`;

        break;
      case EsArgKind.VarArg:
        name = `...${requestedName}`;

        break;
    }

    return esSymbolString(name, { tag, comment });
  }

}

/**
 * Kind of function {@link EsArgSymbol argument}.
 */
export enum EsArgKind {
  /**
   * Argument is required.
   *
   * Its value has to be specified in {@link EsSignature#call function call}.
   *
   * This is the default.
   */
  Required = 'required',

  /**
   * Argument is optional.
   *
   * Its value may be omitted in {@link EsSignature#call function call}.
   */
  Optional = 'optional',

  /**
   * Vararg.
   *
   * May have multiple values in {@link EsSignature#call function call}
   */
  VarArg = 'vararg',
}

/**
 * Definition of function argument.
 */
export type EsArg = EsSymbolInit;

export namespace EsArg {
  /**
   * Custom argument {@link EsArgSymbol#declare declaration}.
   */
  export interface Declaration {
    /**
     * Declares argument.
     *
     * @param naming - Naming of argument `symbol`.
     * @param symbol - Argument symbol to declare.
     */
    declare?: ((this: void, naming: EsNaming, symbol: EsArgSymbol) => EsSource) | undefined;
  }

  /**
   * Argument key consisting of argument {@link NameOf name} along with modifiers.
   *
   * - `${name}` stands for {@link EsArgKind.Required required} argument,
   * - `${name}?` stands for {@link EsArgKind.Optional optional} argument,
   * - `...${name}` stans for {@link EsArgKind.VarArg vararg}.
   */
  export type Key = `${string}` | `${string}?` | `...${string}`;

  /**
   * Argument name extracted from its {@link EsArg.Key key}.
   *
   * @typeParam TKey - Type of argument key.
   */
  export type NameOf<TKey extends Key> = TKey extends `${infer TName}?`
    ? TName
    : TKey extends `...${infer TName}`
    ? TName
    : TKey;
}

/**
 * Initialization options for {@link EsArgSymbol function argument} symbol.
 */
export interface EsArgInit extends EsArg {
  /**
   * Argument position within {@link EsSignature.Args signature}.
   */
  readonly position: number;

  /**
   * Kind of function argument.
   *
   * @defaultValue {@link EsArgKind.Required}.
   */
  readonly kind?: EsArgKind | undefined;
}

/**
 * Function {@link EsArgSymbol argument} naming.
 */
export interface EsArgNaming extends EsNaming {
  /**
   * Named argument symbol
   */
  readonly symbol: EsArgSymbol;

  /**
   * Emits argument {@link declare declaration} code.
   *
   * @returns Argument declaration code.
   */
  asDeclaration(this: void): EsSource;
}

/**
 * Function {@link EsArgSymbol argument} naming constraints.
 *
 * Contains custom argument {@link EsArg.Declaration declaration}.
 */
export interface EsArgNamingConstraints extends EsNamingConstraints, EsArg.Declaration {
  /**
   * Always require new argument name.
   */
  readonly requireNew: true;
}