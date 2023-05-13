import { EsSource } from '../es-source.js';
import { EsArg, EsArgSymbol } from './es-arg.symbol.js';

export class EsArgList<out TArgs extends EsArg.DefMap = EsArg.DefMap> {

  readonly #map: EsArg.Map<TArgs>;

  constructor(args: TArgs) {
    let position = 0;

    this.#map = Object.freeze(
      Object.fromEntries(
        Object.entries(args).map(([name, init]) => [
          name,
          new EsArgSymbol(this, name, { ...init, position: position++ }),
        ]),
      ),
    ) as EsArg.Map<TArgs>;
  }

  get map(): EsArg.Map<TArgs> {
    return this.#map;
  }

  declare(declarations: EsArg.DeclarationMap<TArgs> = {}): EsSource {
    return code => {
      let hasDefaults = false;

      const decls = Object.entries(this.map).map(([name, arg]) => {
        const declaration = declarations[name];

        hasDefaults ||= !!declaration?.defaultValue;

        return arg.declare(declaration);
      });

      if (decls.length > 3 || (hasDefaults && decls.length > 1)) {
        // Each declaration on a new line.
        code
          .write('(')
          .indent(code => {
            decls.forEach(decl => {
              code.inline(decl, ',');
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
