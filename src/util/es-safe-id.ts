import { esEscapeUnsafeId } from './es-safe-id.impl.js';

/**
 * Converts arbitrary string to string safe to be used as ECMAScript identifier.
 *
 * 1. Converts empty string to `_`.
 * 2. Converts [reserved word] to the form `__${id}__`.
 * 3. Encodes subsequent Unicode code points unsafe to be used in [identifiers] as a series of `_x${hex}x${hex}..._`
 *    symbols.
 * 4.
 * Does not modify ECMAScript-safe identifiers.
 *
 * @param id - Arbitrary string to convert.
 *
 * @returns ECMAScript-safe identifier.
 *
 * [identifiers]: https://262.ecma-international.org/#prod-IdentifierName
 * [reserved word]: https://262.ecma-international.org/#prod-ReservedWord
 */
export function esSafeId(id: string): string {
  if (ES_KEYWORDS.has(id)) {
    return id ? `__${id}__` : '__';
  }

  return esEscapeUnsafeId(id);
}

// See https://262.ecma-international.org/#sec-keywords-and-reserved-words
const ES_KEYWORDS = new Set([
  '',
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'new',
  'null',
  'return',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
  // Disallowed in strict mode.
  'let',
  'static',
  'implements',
  'interface',
  'package',
  'private',
  'protected',
  'public',
]);
