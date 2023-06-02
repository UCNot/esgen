import { EsScope } from './es-scope.js';

/**
 * Scoped value key used to access a value stored in {@link EsScope#get scope} under this key.
 *
 * The instance of this key is used to identify the value.
 *
 * Different scopes may contain different values under the same key.
 *
 * @typeParam T - Scoped value type.
 */
export interface EsScopedValueKey<out T> {
  /**
   * Creates value to store in scope.
   *
   * Called unless target scope contains a value under the same key.
   *
   * @param scope - Target scope to create value for.
   *
   * @returns Scoped value.
   */
  esScopedValue(scope: EsScope): T;
}
