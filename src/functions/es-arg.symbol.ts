import { jsStringLiteral } from 'httongue';
import { EsProducer, EsSource } from '../es-source.js';
import { esline } from '../esline.tag.js';
import { EsNaming, EsNamingConstraints, EsSymbol, EsSymbolInit } from '../symbols/es-symbol.js';
import { EsArgList } from './es-arg-list.js';

export class EsArgSymbol extends EsSymbol<EsArgNaming, EsArgNamingConstraints> {

  readonly #argList: EsArgList;
  readonly #position: number;
  readonly #kind: EsArg.Kind;

  constructor(argList: EsArgList, requestedName: string, init: EsArgInit) {
    super(requestedName, init);

    const { position, kind = 'required' } = init;

    this.#argList = argList;
    this.#position = position;
    this.#kind = kind;
  }

  get argList(): EsArgList {
    return this.#argList;
  }

  get position(): number {
    return this.#position;
  }

  get kind(): EsArg.Kind {
    return this.#kind;
  }

  override isUnique(): boolean {
    return false;
  }

  override bind(naming: EsNaming, constraints: EsArgNamingConstraints): EsArgNaming {
    const { comment } = this;
    const { declare = this.#declareArgName() } = constraints;
    const commentCode = comment ? ` /* ${comment} */` : '';
    const code = esline`${declare(naming, this)}${commentCode}`;

    return {
      ...naming,
      symbol: this,
      toCode() {
        return code;
      },
    };
  }

  #declareArgName(): Exclude<EsArgNamingConstraints['declare'], undefined> {
    const { kind } = this;

    return kind === 'vararg' ? ({ name }) => `...${name}` : ({ name }) => name;
  }

  declare(declaration: EsArg.Declaration = {}): EsSource {
    return (code, emission) => {
      const naming = emission.ns.nameSymbol(this, { ...declaration, requireNew: true });

      code.inline(naming);
    };
  }

  toString(): string {
    const { requestedName, position, comment } = this;

    return (
      `Arg ${jsStringLiteral(requestedName, '"')} (#${position})`
      + (comment ? ` /* ${comment} */` : '')
    );
  }

}

export type EsArg = EsSymbolInit;

export namespace EsArg {
  export type Kind = 'required' | 'optional' | 'vararg';
  export type All<TKey extends Key = Key> = {
    readonly [name in TKey]: EsArg;
  };

  export type SymbolMap<TArgs extends All = All> = {
    readonly [name in NamesOf<TArgs>]: EsArgSymbol;
  };

  export interface Declaration {
    declare?(naming: EsNaming, symbol: EsArgSymbol): EsSource;
  }

  export type DeclarationMap<TArgs extends All> = {
    readonly [name in NamesOf<TArgs>]?: Declaration | undefined;
  };

  export type KeysOf<TArgs extends All> = TArgs extends All<infer TKey> ? TKey : never;

  export type NamesOf<TArgs extends All> = Name<KeysOf<TArgs>>;

  export type Key = `${string}` | `${string}?` | `...${string}`;

  export type Name<TKey extends Key> = TKey extends `${infer TName}?`
    ? TName
    : TKey extends `...${infer TName}`
    ? TName
    : TKey;
}

export interface EsArgInit extends EsArg {
  readonly position: number;
  readonly kind?: EsArg.Kind | undefined;
}

export interface EsArgNaming extends EsNaming, EsProducer {
  readonly symbol: EsArgSymbol;
}

export interface EsArgNamingConstraints extends EsNamingConstraints, EsArg.Declaration {
  readonly requireNew: true;
}
