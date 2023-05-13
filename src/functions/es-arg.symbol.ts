import { EsProducer, EsSource } from '../es-source.js';
import { esline } from '../esline.tag.js';
import { EsNaming, EsNamingConstraints, EsSymbol, EsSymbolInit } from '../symbols/es-symbol.js';
import { EsArgList } from './es-arg-list.js';

export class EsArgSymbol extends EsSymbol<EsArgNaming, EsArgNamingConstraints> {

  readonly #argList: EsArgList;
  readonly #position: number;

  constructor(argList: EsArgList, requestedName: string, init: EsArgInit) {
    super(requestedName, init);

    const { position } = init;

    this.#argList = argList;
    this.#position = position;
  }

  get argList(): EsArgList {
    return this.#argList;
  }

  get position(): number {
    return this.#position;
  }

  override isUnique(): boolean {
    return false;
  }

  override bind(naming: EsNaming, constraints: EsArgNamingConstraints): EsArgNaming {
    const { name } = naming;
    const { defaultValue } = constraints;
    const code = defaultValue ? esline`${name} = ${defaultValue}` : name;

    return {
      ...naming,
      symbol: this,
      toCode() {
        return code;
      },
    };
  }

  declare(declaration: EsArg.Declaration = {}): EsSource {
    return (code, emission) => {
      const naming = emission.ns.nameSymbol(this, { ...declaration, requireNew: true });

      code.inline(naming);
    };
  }

}

export namespace EsArg {
  export type Def = EsSymbolInit;

  export interface DefMap {
    readonly [name: string]: Def;
  }

  export type Map<TArgs extends DefMap = DefMap> = {
    readonly [name in keyof TArgs]: EsArgSymbol;
  };

  export interface Declaration {
    readonly defaultValue?: EsSource | undefined;
  }

  export type DeclarationMap<TArgs extends DefMap> = {
    readonly [name in keyof TArgs]?: Declaration | undefined;
  };
}

export interface EsArgInit extends EsArg.Def {
  readonly position: number;
}

export interface EsArgNaming extends EsNaming, EsProducer {
  readonly symbol: EsArgSymbol;
}

export interface EsArgNamingConstraints extends EsNamingConstraints, EsArg.Declaration {
  readonly requireNew: true;
}
