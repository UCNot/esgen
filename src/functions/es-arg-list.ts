import { EsSource } from '../es-source.js';
import { EsArg, EsArgSymbol } from './es-arg.symbol.js';

export class EsArgList<out TArgs extends EsArg.All = EsArg.All> {

  readonly #map: EsArg.SymbolMap<TArgs>;
  readonly #vararg: EsArgSymbol | undefined;

  constructor(args: TArgs) {
    const names = new Set<string>();

    const reserveName = (name: string): EsArg.NamesOf<TArgs> => {
      if (names.has(name)) {
        throw new TypeError(`Duplicate arg: ${name}`);
      }
      names.add(name);

      return name as EsArg.NamesOf<TArgs>;
    };

    const required: [EsArg.NamesOf<TArgs>, EsArg][] = [];
    const optional: [EsArg.NamesOf<TArgs>, EsArg][] = [];
    let varargEntry: [EsArg.NamesOf<TArgs>, EsArg] | undefined;

    for (const [key, arg] of Object.entries(args)) {
      if (key.endsWith('?')) {
        optional.push([reserveName(key.slice(0, -1)), arg]);
      } else if (key.startsWith('...')) {
        const name = reserveName(key.slice(3));

        if (varargEntry) {
          throw new TypeError(`Duplicate vararg: ${name}`);
        }

        varargEntry = [name, arg];
      } else {
        required.push([key as EsArg.NamesOf<TArgs>, arg]);
      }
    }

    let position = 0;
    const map = {
      ...Object.fromEntries(
        required.map(([name, arg]) => [
          name,
          new EsArgSymbol(this, name, { ...arg, position: position++, kind: 'required' }),
        ]),
      ),
      ...Object.fromEntries(
        optional.map(([name, arg]) => [
          name,
          new EsArgSymbol(this, name, { ...arg, position: position++, kind: 'optional' }),
        ]),
      ),
    };

    if (varargEntry) {
      const [name, arg] = varargEntry;

      map[name] = this.#vararg = new EsArgSymbol(this, name, {
        ...arg,
        position: position++,
        kind: 'vararg',
      });
    }

    this.#map = Object.freeze(map as EsArg.SymbolMap<TArgs>);
  }

  get map(): EsArg.SymbolMap<TArgs> {
    return this.#map;
  }

  get vararg(): EsArgSymbol | undefined {
    return this.#vararg;
  }

  declare(declarations: EsArg.DeclarationMap<TArgs> = {}): EsSource {
    return code => {
      let hasCustomDeclaration = false;

      const decls = Object.entries<EsArgSymbol>(this.map).map(([name, arg]) => {
        const declaration = declarations[name as EsArg.NamesOf<TArgs>];

        hasCustomDeclaration ||= !!arg.comment || !!declaration?.declare;

        return arg.declare(declaration);
      });

      if (decls.length > 3 || (hasCustomDeclaration && decls.length > 1)) {
        // Each declaration on a new line.
        code
          .write('(')
          .indent(code => {
            decls.forEach((decl, index, { length }) => {
              if (index + 1 < length || !this.vararg) {
                code.inline(decl, ',');
              } else {
                code.inline(decl);
              }
            });
          })
          .write(')');
      } else {
        // Few declarations on the same line.
        code.inline(
          '(',
          code => {
            decls.forEach((decl, index, { length }) => {
              code.write(decl);
              if (index + 1 < length) {
                code.write(', ');
              }
            });
          },
          ')',
        );
      }
    };
  }

}
