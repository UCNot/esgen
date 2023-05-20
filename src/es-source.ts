import { EsCode } from './es-code.js';
import { EsPrinter } from './es-output.js';
import { EsEmitter, EsScope } from './scopes/es-scope.js';

/**
 * Arbitrary code source that can be {@link EsCode#write written} to code fragment.
 *
 * One of:
 *
 * - string containing source code,
 * - code {@link EsPrinter printer},
 * - code {@link EsEmitter emitter}, including {@link EsCode writable code fragment},
 * - code source {@link EsProducer producer} instance, or
 * - code {@link EsBuilder builder} function.
 */
export type EsSource = string | EsPrinter | EsEmitter | EsProducer | EsBuilder;

/**
 * Code builder signature.
 *
 * Can be used as code {@link EsSource source}.
 *
 * Invoked at {@link EsEmitter#emit code emission} to build the code and write it to the given `code` fragment.
 *
 * @param code - Code fragment to write the built code into.
 * @param scope - Code emission scope.
 *
 * @returns None when code built synchronously, or promise-like instance resolved when code built asynchronously.
 */
export type EsBuilder = (this: void, code: EsCode, scope: EsScope) => void | PromiseLike<void>;

/**
 * Code source producer interface.
 */
export interface EsProducer {
  /**
   * Produces arbitrary code source.
   *
   * @returns Produced code source.
   */
  toCode(): EsSource;
}
