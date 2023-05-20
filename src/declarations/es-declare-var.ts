import { EsSnippet } from '../es-snippet.js';
import {
  EsDeclarationContext,
  EsDeclarationPolicy,
  EsSymbol,
  EsSymbolInit,
} from '../symbols/es-symbol.js';

/**
 * Declares variable in bundle {@link EsDeclarations declarations}.
 *
 * @param requestedName - Requested variable name.
 * @param init - Variable declaration details.
 *
 * @returns Declared variable symbol.
 */
export function esDeclareVar(requestedName: string, init: EsVarDeclaration): EsSymbol {
  const { spec = 'const', value } = init;

  return new EsSymbol(requestedName, {
    ...init,
    declare: {
      ...init,
      as(context) {
        return [
          code => {
            code.line(spec, ' ', context.naming, ' = ', value(context), ';');
          },
          context.naming,
        ];
      },
    },
  });
}

/**
 * Variable {@link esDeclareVar declaration} details.
 */
export interface EsVarDeclaration
  extends Omit<EsSymbolInit, 'declare'>,
    Omit<EsDeclarationPolicy, 'as'> {
  /**
   * Variable declaration specifier (`const`, `let`, or `var`).
   *
   * @defaultValue `const`.
   */
  readonly spec?: 'const' | 'let' | 'var';

  /**
   * Declares the value of the variable.
   *
   * Called on demand, at most once per bundle.
   *
   * @param context - Declaration context.
   *
   * @returns Expression containing the value initializer.
   */
  value(this: void, context: EsDeclarationContext): EsSnippet;
}
