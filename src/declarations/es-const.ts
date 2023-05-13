import { asArray } from '@proc7ts/primitives';
import { safeJsId } from '../impl/safe-js-id.js';
import { EsDeclarationInit, EsDeclaredSymbol } from './es-declared.symbol.js';

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
export function esConst(key: string, initializer: string, init?: EsConstInit): EsDeclaredSymbol;

export function esConst(
  key: string,
  initializer: string,
  { exported, refers, prefix = exported ? '' : 'CONST_' }: EsConstInit = {},
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

/**
 * Constant initialization options.
 */

export interface EsConstInit extends Omit<EsDeclarationInit, 'declare'> {
  /**
   * Constant name prefix.
   *
   * @defaultValue `'CONST_'`, unless constant exported.
   */
  readonly prefix?: string | undefined;
}

const esConst$cache = new Map<string, EsConstSymbol>();

class EsConstSymbol extends EsDeclaredSymbol {

  constructor(requestedName: string, initializer: string, init: EsConstInit) {
    super(requestedName, {
      ...init,
      declare: ({ naming: { name } }) => `const ${name} = ${initializer};`,
    });
  }

}
