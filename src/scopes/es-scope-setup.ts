import { EsScope } from './es-scope.js';
import { EsScopedValueKey } from './es-scoped-value-key.js';

/**
 * Code emission scope setup.
 *
 * Can be {@link EsScopeInit#setup applied} during scope initialization e.g. to provide
 * {@link EsScopeContext#set scoped values}.
 *
 * @typeParam TScope - Supported type of scope.
 */
export interface EsScopeSetup<in TScope extends EsScope = EsScope> {
  /**
   * Sets up code emission scope.
   *
   * @param context - Scope setup context.
   */
  esSetupScope(context: EsScopeContext<TScope>): void;
}

/**
 * Context of code emission scope {@link EsScopSetup#esSetupScope setup}.
 *
 * @typeParam TScope - Supported type of scope.
 */
export interface EsScopeContext<out TScope extends EsScope = EsScope> {
  /**
   * Scope to initialize.
   */
  readonly scope: TScope;

  /**
   * Assigns scoped value under the given key.
   *
   * @param key - Scoped value key.
   * @param value - Scoped value to assign.
   *
   * @returns `this` instance.
   */
  set<T>(key: EsScopedValueKey<T>, value: T): this;
}
