import { isArray } from '@proc7ts/primitives';
import { jsStringLiteral } from 'httongue';
import { EsSource } from '../es-source.js';
import { EsArg, EsArgKind, EsArgSymbol } from './es-arg.symbol.js';

/**
 * Function signature declaring function arguments.
 *
 * Contains named argument {@link args}.
 *
 * Can be used to {@link declare} functions and to {@link call} it.
 *
 * @typeParam TArgs - Type of arguments definition.
 */
export class EsSignature<out TArgs extends EsSignature.Args = EsSignature.Args> {

  /**
   * Creates signature for the given arguments definition.
   *
   * @param args - Either function signature or arguments definition.
   *
   * @returns Signature itself if `args` is a signature instance already, or new signature instance.
   */
  static for<TArgs extends EsSignature.Args>(args: EsSignature<TArgs> | TArgs): EsSignature<TArgs> {
    return args instanceof EsSignature ? args : new EsSignature(args);
  }

  readonly #args: EsSignature.Symbols<TArgs>;
  readonly #vararg: EsArgSymbol | undefined;

  /**
   * Constructs function signature.
   *
   * Signature arguments is an object literal containing {@link EsArg.Key argument keys} and corresponding
   * {@link EsArg argument definitions}. Keys are argument names with modifiers.
   *
   * @example
   * ```typescript
   * new EsSignature({
   *   requiredArg: { comment: 'This argument should be specified in function call' },
   *   'optionalArg?': { comment: 'This argument may be omitted' },
   *   '...rest': { comment: 'This argument amy have multiple values' },
   * });
   * ```
   *
   * @param args - Definition os signature arguments.
   */
  constructor(args: TArgs) {
    const names = new Set<string>();

    const reserveName = (name: string): EsSignature.NamesOf<TArgs> => {
      if (names.has(name)) {
        throw new TypeError(`Duplicate arg: ${jsStringLiteral(name, '"')}`);
      }
      names.add(name);

      return name as EsSignature.NamesOf<TArgs>;
    };

    const required: [EsSignature.NamesOf<TArgs>, EsArg][] = [];
    const optional: [EsSignature.NamesOf<TArgs>, EsArg][] = [];
    let varargEntry: [EsSignature.NamesOf<TArgs>, EsArg] | undefined;

    for (const [key, arg] of Object.entries(args)) {
      if (key.endsWith('?')) {
        optional.push([reserveName(key.slice(0, -1)), arg]);
      } else if (key.startsWith('...')) {
        const name = reserveName(key.slice(3));

        if (varargEntry) {
          throw new TypeError(`Duplicate vararg: ${jsStringLiteral(name, '"')}`);
        }

        varargEntry = [name, arg];
      } else {
        required.push([reserveName(key), arg]);
      }
    }

    let position = 0;
    const symbols = {
      ...Object.fromEntries(
        required.map(([name, arg]) => [
          name,
          new EsArgSymbol(this, name, { ...arg, position: position++ }),
        ]),
      ),
      ...Object.fromEntries(
        optional.map(([name, arg]) => [
          name,
          new EsArgSymbol(this, name, { ...arg, position: position++, kind: EsArgKind.Optional }),
        ]),
      ),
    };

    if (varargEntry) {
      const [name, arg] = varargEntry;

      symbols[name] = this.#vararg = new EsArgSymbol(this, name, {
        ...arg,
        position: position++,
        kind: EsArgKind.VarArg,
      });
    }

    this.#args = Object.freeze(symbols as EsSignature.Symbols<TArgs>);
  }

  /**
   * Per-argument symbols available by their {@link EsArg.NameOf names} rather {@link EsArg.Key keys}.
   */
  get args(): EsSignature.Symbols<TArgs> {
    return this.#args;
  }

  /**
   * {@link EsArgKind.VarArg Vararg} symbol, of any.
   */
  get vararg(): EsArgSymbol | undefined {
    return this.#vararg;
  }

  /**
   * Declares function parameters.
   *
   * @param declarations - Custom per-argument declarations, e.g. containing default values or destructuring.
   *
   * @returns Source of code containing comma-separated argument {@link EsArgSymbol#declare declarations} enclosed into
   * parentheses.
   */
  declare(declarations: EsSignature.Declarations<TArgs> = {}): EsSource {
    return code => {
      let hasCustomDeclaration = false;

      const decls = Object.entries<EsArgSymbol>(this.args).map(([name, arg]) => {
        const declaration = declarations[name as EsSignature.NamesOf<TArgs>];

        hasCustomDeclaration ||= !!arg.comment || !!declaration?.declare;

        return arg.declare(declaration);
      });

      if (decls.length > 3 || (hasCustomDeclaration && decls.length > 1)) {
        // Each declaration on a new line.
        code.block(code => {
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
        });
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

  /**
   * Calls a function.
   *
   * @param args - Named argument values.
   *
   * @returns Source of code containing comma-separated argument values enclosed into parentheses.
   */
  call(
    ...args: EsSignature.RequiredKeyOf<TArgs> extends never
      ? [EsSignature.ValuesOf<TArgs>?]
      : [EsSignature.ValuesOf<TArgs>]
  ): EsSource;

  call(args: EsSignature.ValuesOf<TArgs> = {} as EsSignature.ValuesOf<TArgs>): EsSource {
    const argValues = this.#buildArgValues(args);

    if (argValues.length > 3) {
      // Each value on new line.
      return code => {
        code.block(code => {
          code
            .write('(')
            .indent(code => {
              for (const argValue of argValues) {
                code.inline(argValue, ',');
              }
            })
            .write(')');
        });
      };
    }

    // Inline arguments.
    return code => {
      code.inline(code => {
        code.write('(');
        argValues.forEach((argValue, index, { length }) => {
          if (index + 1 < length) {
            code.inline(argValue, ', ');
          } else {
            code.write(argValue);
          }
        });
        code.write(')');
      });
    };
  }

  #buildArgValues(values: EsSignature.ValuesOf<TArgs>): EsSource[] {
    const argValues: EsSource[] = [];

    for (const name of Object.keys(this.args)) {
      const argValue: EsSource | readonly EsSource[] | undefined =
        values[name as keyof typeof values];

      if (argValue == null) {
        // Optional argument without value.
        // Place `undefined` instead.
        argValues.push('undefined');
      } else if (isArray(argValue)) {
        // Vararg is always the last.
        argValues.push(...argValue);
      } else {
        argValues.push(argValue);
      }
    }

    // Remove trailing `undefined` values.
    for (let i = argValues.length - 1; i >= 0; --i) {
      if (argValues[i] === 'undefined') {
        argValues.length = i;
      } else {
        break;
      }
    }

    return argValues;
  }

  toString(): string {
    return (
      `(`
      + Object.values<EsArgSymbol>(this.args)
        .map(arg => arg.toString({ tag: null }))
        .join(', ')
      + ')'
    );
  }

}

export namespace EsSignature {
  /**
   * Definition of signature arguments.
   *
   * Contains each argument {@link EsArg.Key key} and corresponding {@link EsArg argument definition}.
   *
   * Signature key is an argument name, possibly with modifier. Corresponding argument symbol will be available in
   * {@link EsSignature#args signature} under this name.
   *
   * @typeParam TKey - Type of argument keys.
   */
  export type Args<TKey extends EsArg.Key = EsArg.Key> = {
    readonly [name in TKey]: EsArg;
  };

  /**
   * Signature argument symbols for the {@link EsArg.NameOf named} arguments.
   *
   * @typeParam TArgs - Type of arguments definition.
   */
  export type Symbols<TArgs extends Args = Args> = {
    readonly [name in NamesOf<TArgs>]: EsArgSymbol;
  };

  /**
   * Signature argument {@link EsArg.Declaration declarations} for the {@link EsArg.NameOf named} arguments.
   *
   * @typeParam TArgs - Type of arguments definition.
   */
  export type Declarations<TArgs extends Args> = {
    readonly [name in NamesOf<TArgs>]?: EsArg.Declaration | undefined;
  };

  /**
   * Argument {@link EsArg.Key keys} extracted from signature arguments {@link EsSignature.Args definition}.
   *
   * @typeParam TArgs - Type of arguments definition.
   */
  export type KeysOf<TArgs extends Args> = TArgs extends Args<infer TKey> ? TKey : never;

  /**
   * {@link EsArgKind.Required Required} argument {@link EsArg.Key keys} extracted from signature arguments
   * {@link EsSignature.Args definition}.
   *
   * @typeParam TArgs - Type of arguments definition.
   */
  export type RequiredKeyOf<TArgs extends Args> = TArgs extends Args<infer TKey>
    ? TKey extends `${string}?` | `...${string}`
      ? never
      : TKey
    : never;

  /**
   * {@link EsArgKind.Optional Optional} argument {@link EsArg.Key keys} extracted from signature arguments
   * {@link EsSignature.Args definition}.
   *
   * @typeParam TArgs - Type of arguments definition.
   */
  export type OptionalKeyOf<TArgs extends Args> = TArgs extends Args<infer TKey>
    ? TKey extends `${infer TOptionalKey}?`
      ? TOptionalKey
      : never
    : never;

  /**
   * {@link EsArgKind.VarArg Vararg} argument {@link EsArg.Key keys} extracted from signature arguments
   * {@link EsSignature.Args definition}.
   *
   * @typeParam TArgs - Type of arguments definition.
   */
  export type VarArgKeyOf<TArgs extends Args> = TArgs extends Args<infer TKey>
    ? TKey extends `...${infer TVarArgKey}`
      ? TVarArgKey
      : never
    : never;

  /**
   * Argument {@link EsArg.NameOf names} extracted from signature arguments {@link EsSignature.Args definition}.
   *
   * @typeParam TArgs - Type of arguments definition.
   */
  export type NamesOf<TArgs extends Args> = EsArg.NameOf<KeysOf<TArgs>>;

  /**
   * Named argument values to pass to {@link EsSignature#call function call}.
   *
   * @typeParam TArgs - Type of arguments definition.
   */
  export type ValuesOf<TArgs extends Args> = {
    readonly [key in EsArg.NameOf<RequiredKeyOf<TArgs>>]: EsSource;
  } & {
    readonly [key in EsArg.NameOf<OptionalKeyOf<TArgs>>]?: EsSource | undefined;
  } & {
    readonly [key in EsArg.NameOf<VarArgKeyOf<TArgs>>]?: EsSource | readonly EsSource[] | undefined;
  };
}
