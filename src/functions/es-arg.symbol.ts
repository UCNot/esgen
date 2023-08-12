import { lazyValue } from '@proc7ts/primitives';
import { EsSnippet } from '../code/es-snippet.js';
import { EsScope } from '../scopes/es-scope.js';
import { EsNaming, EsSymbol, EsSymbolInit } from '../symbols/es-symbol.js';
import { EsSignature } from './es-signature.js';

/**
 * Function argument symbol.
 *
 * Declared by {@link EsSignature#args function signature} typically.
 */
export class EsArgSymbol extends EsSymbol<EsArgNaming> {

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
    super(requestedName, { ...init, unique: false });

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
   * Argument {@link EsArg.Key key} including modifiers.
   */
  get argKey(): EsArg.Key {
    const { kind, requestedName } = this;

    switch (kind) {
      case EsArgKind.Required:
        return requestedName;
      case EsArgKind.Optional:
        return `${requestedName}?`;
      case EsArgKind.VarArg:
        return `...${requestedName}`;
    }
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

  /**
   * Kind of argument.
   */
  get kind(): EsArgKind {
    return this.#kind;
  }

  #declareArgName(): Exclude<EsArg.Declaration['declare'], undefined> {
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
   * @returns Code snippet containing argument declaration.
   */
  declare(declaration: EsArg.Declaration = {}): EsSnippet {
    return (code, scope) => {
      code.line(this.#declareIn(scope, declaration).asDeclaration());
    };
  }

  #declareIn(
    { ns }: EsScope,
    { declare = this.#declareArgName() }: EsArg.Declaration,
  ): EsArgNaming {
    return ns.addSymbol(this, naming => ({
      ...naming,
      symbol: this,
      asDeclaration: lazyValue(() => code => {
        code.line(code => {
          const { comment } = this;

          code.write(declare(naming, this));
          if (comment.lineCount) {
            code.write(' ', comment);
          }
        });
      }),
    }));
  }

  override toString(): string {
    const { argKey, comment } = this;

    return comment.appendTo(argKey, `[Arg #${this.position}]`);
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
export type EsArg = Omit<EsSymbolInit, 'unique' | 'declare'>;

export namespace EsArg {
  /**
   * Custom argument {@link EsArgSymbol#declareSymbol declaration}.
   */
  export interface Declaration {
    /**
     * Declares argument.
     *
     * @param naming - Naming of argument `symbol`.
     * @param symbol - Argument symbol to declare.
     */
    declare?: ((this: void, naming: EsNaming, symbol: EsArgSymbol) => EsSnippet) | undefined;
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
   * Emits argument {@link EsArgSymbol#declareSymbol declaration} code.
   *
   * @returns Argument declaration code.
   */
  asDeclaration(this: void): EsSnippet;
}
