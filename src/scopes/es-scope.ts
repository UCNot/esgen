import { EsPrinter } from '../code/es-output.js';
import { EsDeclarations } from '../declarations/es-declarations.js';
import { EsImports } from '../symbols/es-imports.js';
import { EsNamespace, EsNamespaceInit, EsNamingHost } from '../symbols/es-namespace.js';
import { EsBundleFormat } from './es-bundle-format.js';
import { EsBundle } from './es-bundle.js';

/**
 * Code emission scope.
 *
 * Ensures that all code {@link EsEmitter#emit emitted} _before_ the code printed.
 *
 * Code may be emitted in multiple {@link EsEmissionSpan spans} in arbitrary order.
 *
 * Scopes may be {@link nest nested}.
 */
export interface EsScope extends EsNamingHost {
  /**
   * Enclosing code bundle.
   */
  get bundle(): EsBundle;

  /**
   * Enclosing scope.
   *
   * Returns itself for the {@link EsBundle}.
   */
  get enclosing(): EsScope;

  /**
   * Closest {@link EsScopeKind.Function function} or {@link EsScopeKind.Bundle scope}.
   */
  get functionOrBundle(): EsScope;

  /**
   * Scope kind.
   */
  get kind(): EsScopeKind;

  /**
   * Format of the bundled code.
   */
  get format(): EsBundleFormat;

  /**
   * Import declarations of the {@link bundle}.
   */
  get imports(): EsImports;

  /**
   * Declarations of the {@link bundle}.
   */
  get declarations(): EsDeclarations;

  /**
   * Namespace used to name the symbols.
   */
  get ns(): EsNamespace;

  /**
   * Informs whether this is an asynchronous scope.
   *
   * `await` expressions can be emitted only within asynchronous scopes.
   *
   * @returns `true` for a top-level {@link EsBundle bundle}, or a scope within {@link EsScopeInit#async
   * asynchronous function}.
   */
  isAsync(): boolean;

  /**
   * Informs whether this is a generator scope.
   *
   * `yield` expressions can be emitted only within generator scopes.
   *
   * @returns `true` for scope within {@link EsScopeInit#generator generator function}.
   */
  isGenerator(): boolean;

  /**
   * Checks whether the emission is still active.
   *
   * @returns `true` if emission is in process, or `false` if emission is {@link EsBundle#done completed}.
   */
  isActive(): boolean;

  /**
   * Creates nested emission scope.
   *
   * @param init - Nested emission scope options.
   *
   * @returns New code emission scope.
   */
  nest(init?: EsScopeInit): EsScope;

  /**
   * Starts new emission span.
   *
   * @param emitters - Code emitters to emit the code into the span.
   *
   * @returns New code emission span.
   */
  span(...emitters: EsEmitter[]): EsEmissionSpan;

  /**
   * Awaits for all code emissions completed.
   *
   * @returns Promise resolved when all code emission completes.
   */
  whenDone(): Promise<void>;
}

/**
 * Initialization options for {@link EsScope#nest nested} emission scope.
 */
export interface EsScopeInit {
  /**
   * Kind of created scope.
   *
   * @defaultValue {@link EsScopeKind.Block block scope}.
   */
  readonly kind?: Exclude<EsScopeKind, EsScopeKind.Bundle> | undefined;

  /**
   * Whether this is a scope within asynchronous function.
   *
   * Accepted only for {@link EsScopeKind.Function function} scope. Derived from enclosing scope otherwise.
   *
   * `await` expressions can be emitted only within asynchronous scopes.
   */
  readonly async?: boolean | undefined;

  /**
   * Whether this is a scope within generator function.
   *
   * Accepted only for {@link EsScopeKind.Function function} scope. Derived from {@link EsScope#enclosing enclosing}
   * scope otherwise.
   *
   * `yield` expressions can be emitted only within generator scopes.
   */
  readonly generator?: boolean | undefined;

  /**
   * Initialization options for {@link EsNamespace#nest nested namespace}.
   */
  readonly ns?: Omit<EsNamespaceInit, 'enclosing'> | undefined;
}

/**
 * Kind of code emission {@link EsScope scope}.
 */
export enum EsScopeKind {
  /**
   * Top-level {@link EsBundle bundle}.
   */
  Bundle = 'bundle',

  /**
   * Function.
   */
  Function = 'function',

  /**
   * Block within {@link Function function} or {@link Function bundle}.
   */
  Block = 'block',
}

/**
 * Code emission span used to {@link emit} additional code and to {@link printer print} it then.
 */
export interface EsEmissionSpan {
  /**
   * Emitted code printer.
   */
  readonly printer: EsPrinter;

  /**
   * Emits additional code.
   *
   * Can be called before the emitted code {@link printer printed}.
   *
   * @param emitters - Additional code emitters.
   */
  emit(this: void, ...emitters: EsEmitter[]): void;
}

/**
 * Code emitter invoked prior to code {@link EsPrinter print}.
 *
 * Multiple code emissions may be active at the same time. More code emissions may be started while emitting the code.
 * However, all code emissions have to complete _before_ the emitted code printed.
 */
export interface EsEmitter {
  /**
   * Emits the code in the given `scope`.
   *
   * @param scope - Code emission scope.
   *
   * @returns Emission result.
   */
  emit(scope: EsScope): EsEmissionResult;
}

/**
 * Code {@link EsEmitter#emit emission} result.
 *
 * Either printable string, emitted code printer, or a promise-like instance resolving to one of the above.
 */
export type EsEmissionResult = string | EsPrinter | PromiseLike<string | EsPrinter>;
