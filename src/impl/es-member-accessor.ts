import { jsStringLiteral } from 'httongue';
import type { EsMemberVisibility } from '../classes/es-member.js';
import { esSafeId } from '../util/es-safe-id.js';

export function esMemberAccessor(
  name: string,
  visibility: EsMemberVisibility,
): { key: string; accessor: string } {
  const safeId = esSafeId(name);

  if (visibility === 'private') {
    return {
      key: `#${safeId}`,
      accessor: `.#${safeId}`,
    };
  }

  if (safeId === name) {
    return { key: name, accessor: `.${name}` };
  }

  const key = `[${jsStringLiteral(name)}]`;

  return { key, accessor: key };
}
