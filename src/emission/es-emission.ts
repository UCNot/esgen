import { EsDeclarations } from '../declarations/es-declarations.js';
import { EsPrinter } from '../es-output.js';
import { EsImports } from '../symbols/es-imports.js';
import { EsNamespace, EsNamespaceInit } from '../symbols/es-namespace.js';
import { EsBundleFormat } from './es-bundle-format.js';
import { EsBundle } from './es-bundle.js';

/**
 * Code emission control.
 *
 * Ensures that all code {@link EsEmitter#emit emitted} _before_ the code printed.
 *
 * Code may be emitted in multiple {@link EsEmissionSpan spans} in arbitrary order.
 *
 * Emissions may {@link spawn} more emissions, e.g. for nested namespaces.
 */
export interface EsEmission {
  /**
   * Code bundle control that {@link spawn spawned} this emission.
   */
  get bundle(): EsBundle;

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
   * Namespace to {@link EsNamespace#nameSymbol bind local symbols} to.
   */
  get ns(): EsNamespace;

  /**
   * Checks whether the emission is still active.
   *
   * @returns `true` if emission is in process, or `false` if emission is {@link EsBundle#done completed}.
   */
  isActive(): boolean;

  /**
   * Spawns another emission.
   *
   * @param init - Nested emission options.
   *
   * @returns New emission instance.
   */
  spawn(init?: EsEmissionInit): EsEmission;

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
 * Initialization options for {@link EsEmission#spawn spawned} code emission.
 */
export interface EsEmissionInit {
  /**
   * Initialization options for {@link EsNamespace#nest nested namespace}.
   */
  readonly ns?: Omit<EsNamespaceInit, 'enclosing'> | undefined;
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
 * Multiple code emissions may be active at the same time. More code emissions may be {@link EsEmission#spawn spawned}
 * while emitting the code. However, all code emissions have to complete _before_ the emitted code printed.
 */
export interface EsEmitter {
  /**
   * Emits the code during code `emission`.
   *
   * @param emission - Code emission control.
   *
   * @returns Emission result.
   */
  emit(emission: EsEmission): EsEmissionResult;
}

/**
 * Code {@link EsEmitter#emit emission} result.
 *
 * Either printable string, emitted code printer, or a promise-like instance resolving to one of the above.
 */
export type EsEmissionResult = string | EsPrinter | PromiseLike<string | EsPrinter>;
