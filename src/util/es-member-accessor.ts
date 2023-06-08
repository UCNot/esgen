import { jsStringLiteral } from 'httongue';
import { EsMemberVisibility } from '../classes/es-member-visibility.js';
import { esEscapeUnsafeId } from './es-safe-id.impl.js';
import { esSafeId } from './es-safe-id.js';

/**
 * Creates the named member accessor expression.
 *
 * If the given `name` is safe to be used as ID, a `.name` syntax is used. A `['name']` syntax is used otherwise.
 *
 * {@link EsMemberVisibility#Private Private} member names always converted to the {@link esSafeId safe form} and
 * prepended by `#` sign.
 *
 * @param name - Accessed member name.
 * @param visibility - Accessed member visibility. {@link EsMemberVisibility#Public Public} by default.
 *
 * @returns
 */
export function esMemberAccessor(
  name: string,
  visibility: EsMemberVisibility = EsMemberVisibility.Public,
): {
  /**
   * Member key that can be used e.g. within class declarations or as object literal key.
   */
  key: string;

  /**
   * Member accessor to be appended to host object reference..
   */
  accessor: string;
} {
  if (visibility === EsMemberVisibility.Private) {
    const safeId = name ? esEscapeUnsafeId(name) : '__';

    return {
      key: `#${safeId}`,
      accessor: `.#${safeId}`,
    };
  }

  if (ES_RESERVED_PUBLIC.has(name)) {
    const key = `['${name}']`;

    return { key, accessor: key };
  }

  const safeId = esEscapeUnsafeId(name);

  if (safeId === name) {
    return { key: name, accessor: `.${name}` };
  }

  const key = `[${jsStringLiteral(name)}]`;

  return { key, accessor: key };
}

const ES_RESERVED_PUBLIC = new Set(['', 'constructor']);
