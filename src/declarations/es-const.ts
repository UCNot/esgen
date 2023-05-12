import { asArray } from '@proc7ts/primitives';
import { safeJsId } from '../impl/safe-js-id.js';
import { EsDeclaredSymbol } from './es-declared-symbol.js';

/**
 * Declares constant.
 *
 * Constants are typically temporary values initialized to simple values.
 *
 * Constant name is built as `${prefix}${key}`, unless the constant is exported. An exported constant uses `key` as its
 * name.
 *
 * Constants are cached, o.e. constant symbols with the same initializers will be reused,
 *
 * @param key - Constant key.
 * @param initializer - Constant initializer. This has to be valid expression.
 * @param init - Constant initialization options.
 *
 * @returns Declared constant symbol.
 */
export function esConst(
  key: string,
  initializer: string,
  init?: EsDeclaredSymbol.ConstInit,
): EsDeclaredSymbol;

export function esConst(
  key: string,
  initializer: string,
  { exported, refers, prefix = exported ? '' : 'CONST_' }: EsDeclaredSymbol.ConstInit = {},
): EsDeclaredSymbol {
  refers = asArray(refers);

  const cache = exported || refers.length ? null : esConst$cache;

  const existingConst = cache?.get(initializer);

  if (existingConst) {
    return existingConst;
  }

  const newConst = new EsConstSymbol(safeJsId(`${prefix}${key}`), initializer, {
    exported,
    refers,
  });

  cache?.set(initializer, newConst);

  return newConst;
}

const esConst$cache = new Map<string, EsConstSymbol>();

class EsConstSymbol extends EsDeclaredSymbol {

  constructor(requestedName: string, initializer: string, init: EsDeclaredSymbol.ConstInit) {
    super(requestedName, {
      ...init,
      declare: ({ binding: { name } }) => `const ${name} = ${initializer};`,
    });
  }

}
