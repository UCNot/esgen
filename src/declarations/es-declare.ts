import { EsSnippet } from '../es-snippet.js';
import { EsDeclarationContext, EsDeclarationInit, EsDeclaredSymbol } from './es-declared.symbol.js';

/**
 * Declares variable in bundle {@link EsDeclarations declarations}.
 *
 * @param requestedName - Requested variable name.
 * @param init - Variable declaration details.
 *
 * @returns Declared variable symbol.
 */
export function esDeclare(requestedName: string, init: EsDeclaration): EsDeclaredSymbol {
  const { spec = 'const', value } = init;

  return new EsDeclaredSymbol(requestedName, {
    ...init,
    declare(context) {
      return code => {
        code.line(spec, ' ', context.naming.name, ' = ', value(context), ';');
      };
    },
  });
}

/**
 * Variable {@link esDeclare declaration} details.
 */
export interface EsDeclaration extends Omit<EsDeclarationInit, 'declare'> {
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
