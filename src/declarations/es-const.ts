import { asArray } from '@proc7ts/primitives';
import { esline } from '../code/esline.tag.js';
import {
  EsDeclarationLocation,
  EsDeclarationPolicy,
  EsSymbol,
  EsSymbolInit,
} from '../symbols/es-symbol.js';
import { esSafeId } from '../util/es-safe-id.js';

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
export function esConst(key: string, initializer: string, init?: EsConstInit): EsSymbol;

export function esConst(key: string, initializer: string, init: EsConstInit = {}): EsSymbol {
  const { at = 'bundle', prefix = at === 'exports' ? '' : 'CONST_' } = init;
  let { refers } = init;

  refers = asArray(refers);

  const cache = at !== 'bundle' || refers.length ? null : esConst$cache;

  const existingConst = cache?.get(initializer);

  if (existingConst) {
    return existingConst;
  }

  const newConst = new EsSymbol(esSafeId(`${prefix}${key}`), {
    declare: {
      at,
      refers,
      as: ({ naming }) => [esline`const ${naming} = ${initializer};`, naming],
    },
  });

  cache?.set(initializer, newConst);

  return newConst;
}

/**
 * Constant initialization options.
 */

export interface EsConstInit
  extends Omit<EsSymbolInit, 'declare'>,
    Omit<EsDeclarationPolicy, 'at' | 'as'> {
  /**
   * Where to place the constant declaration.
   *
   * @defaultValue `bundle`
   */
  readonly at?: EsDeclarationLocation | undefined;

  /**
   * Constant name prefix.
   *
   * @defaultValue `'CONST_'`, unless constant exported.
   */
  readonly prefix?: string | undefined;
}

const esConst$cache = new Map<string, EsSymbol>();
