import { EsBundle } from './es-bundle.js';
import { EsPrinter } from './es-output.js';
import { EsNamespace } from './symbols/es-namespace.js';

/**
 * Code emission control.
 *
 * Ensures that all code {@link EsCode#emit emitted} before the code printed.
 *
 * Code emitted in multiple {@link EsEmission.Span spans} in arbitrary order.
 *
 * Emissions may {@link spawn} more emissions, e.g. for nested namespaces.
 */
export interface EsEmission {
  /**
   * Bundling control that {@link spawn spawned} this emission.
   */
  get bundle(): EsBundle;

  /**
   * Namespace to {@link EsNamespace#bindSymbol bind local symbols} to.
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
  spawn(init?: EsEmission.Init): EsEmission;

  /**
   * Starts new emission span.
   *
   * @param emitters - Code emitters to emit the code into the span.
   *
   * @returns New code emission span.
   */
  span(...emitters: EsEmitter[]): EsEmission.Span;

  /**
   * Awaits for all code emissions completed.
   *
   * @returns Promise resolved when all code emission completes.
   */
  whenDone(): Promise<void>;
}

export namespace EsEmission {
  /**
   * Initialization options for {@link EsEmission#spawn spawned} code emission.
   */
  export interface Init {
    /**
     * Initialization options for {@link EsNamespace#nest nested namespace}.
     */
    readonly ns?: Omit<EsNamespace.Init, 'enclosing'> | undefined;
  }

  /**
   * Code emission span used to {@link emit} additional code and to {@link printer print} it then.
   */
  export interface Span {
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
}

/**
 * Code emitter invoked prior the code print.
 *
 * Multiple code emissions may be active at the same time. More code emissions may be initiated while emitting the code.
 * However, all code emissions has to complete _before_ the emitted code printed.
 */
export interface EsEmitter {
  /**
   * Emits the code during code `emission`.
   *
   * @param emission - Code emission control.
   *
   * @returns Either printed string, emitted code printer, or a promise-like instance of the one of the above.
   */
  emit(emission: EsEmission): string | EsPrinter | PromiseLike<string | EsPrinter>;
}
