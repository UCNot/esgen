import { EveryPromiseResolver, PromiseResolver } from '@proc7ts/async';
import { lazyValue } from '@proc7ts/primitives';
import { EsOutput, EsPrinter } from '../es-output.js';
import { EsNamespace } from '../symbols/es-namespace.js';
import { EsBundleFormat } from './es-bundle-format.js';
import { EsEmission, EsEmitter } from './es-emission.js';

/**
 * Code bundle control.
 *
 * Controls the emission of the code supposed to be placed to the same bundle (i.e. module, file, etc.).
 */
export class EsBundle implements EsEmission {

  readonly #state: [EsEmission$State];
  readonly #format: EsBundleFormat;
  readonly #ns: EsNamespace;

  /**
   * Constructs bundle emission control.
   *
   * @param init - Bundle emission initialization options.
   */
  constructor(init?: EsBundle.Init);
  constructor({
    format = EsBundleFormat.Default,
    ns = new EsNamespace({ comment: 'Bundle' }),
  }: EsBundle.Init = {}) {
    this.#format = format;
    this.#ns = ns;
    this.#state = [new EsEmission$ActiveState(newState => (this.#state[0] = newState))];
  }

  /**
   * Always refers to itself.
   */
  get bundle(): this {
    return this;
  }

  get format(): EsBundleFormat {
    return this.#format;
  }

  get ns(): EsNamespace {
    return this.#ns;
  }

  isActive(): boolean {
    return this.#state[0].isActive();
  }

  spawn(init?: EsEmission.Init): EsEmission {
    return new SpawnedEsEmission(
      this,
      this.#state,
      new EsNamespace({ ...init?.ns, enclosing: this.ns }),
    );
  }

  span(...emitters: EsEmitter[]): EsEmission.Span {
    return this.#state[0].emit(this, ...emitters);
  }

  async whenDone(): Promise<void> {
    await this.#state[0].whenDone();
  }

  /**
   * Stops code emission.
   *
   * @returns Promise resolved when pending code emissions completed.
   */
  async done(): Promise<void> {
    await this.#state[0].done();
  }

  /**
   * Bundles emitted code.
   *
   * @param emitters - Code emitters.
   *
   * @returns Bundling result in appropriate {@link format}.
   */
  emit(...emitters: EsEmitter[]): EsBundle.Result {
    const { printer } = this.span(...emitters);
    const toText = lazyValue(async () => {
      const output = new EsOutput();

      await this.#print(printer, output);

      return await output.toText();
    });

    return {
      printTo: async out => {
        await this.#print(printer, out);
      },
      toText,
      toExports: this.#toExports(toText),
    };
  }

  async #print(printer: EsPrinter, out: EsOutput): Promise<void> {
    await this.done();

    const body = this.#printBody(printer);

    switch (this.format) {
      case EsBundleFormat.IIFE:
        out
          .print(`return (async () => {`)
          .indent(out => out.print(body, /* TODO Add exports instead */ 'return {};'))
          .print(`})();`);

        break;
      case EsBundleFormat.ES2015:
        out.print(body);

        break;
    }
  }

  #printBody(printer: EsPrinter): EsPrinter {
    return {
      printTo: out => {
        // TODO Add imports here.
        // TODO Add declarations here.
        out.print(printer);
        // TODO Add exports here.
      },
    };
  }

  #toExports(toText: () => Promise<string>): () => Promise<Record<string, unknown>> {
    const { format } = this;

    if (format !== EsBundleFormat.IIFE) {
      return this.#doNotExport.bind(this);
    }

    return async () => await this.#export(toText);
  }

  async #export(toText: () => Promise<string>): Promise<Record<string, unknown>> {
    const text = await toText();
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const factory = Function(text) as () => Promise<Record<string, unknown>>;

    return await factory();
  }

  #doNotExport(): Promise<never> {
    return Promise.reject(new TypeError(`Can not export from ${this.format} bundle`));
  }

}

export namespace EsBundle {
  /**
   * Initialization options for bundle emission.
   *
   * @typeParam TFormat - Supported bundled code format.
   */
  export interface Init<out TFormat extends EsBundleFormat = EsBundleFormat> {
    /**
     * Format of the bundled code.
     *
     * @defaultValue {@link EsBundleFormat.Default}.
     */
    readonly format?: TFormat | undefined;

    /**
     * Top-level namespace to use.
     *
     * @defaultValue New namespace instance.
     */
    readonly ns?: EsNamespace | undefined;
  }

  /**
   * Result of code {@link EsBundle#bundle bundling}.
   *
   * Accessing the result would {@link EsBundle#done stop} code emission.
   */
  export interface Result extends EsPrinter {
    /**
     * Prints the bundled code as text.
     *
     * @returns Promise resolved to printed text.
     */
    toText(this: void): Promise<string>;

    /**
     * Builds code exports.
     *
     * Can be called only for {@link EsBundleFormat.IIFE IIFE}.
     *
     * @returns Promise resolved to record containing exported declarations.
     */
    toExports(): Promise<Record<string, unknown>>;
  }
}

class SpawnedEsEmission implements EsEmission {

  readonly #bundle: EsBundle;
  readonly #state: [EsEmission$State];
  readonly #ns: EsNamespace;

  constructor(bundle: EsBundle, state: [EsEmission$State], ns: EsNamespace) {
    this.#bundle = bundle;
    this.#state = state;
    this.#ns = ns;
  }

  get bundle(): EsBundle {
    return this.#bundle;
  }

  get format(): EsBundleFormat {
    return this.bundle.format;
  }

  get ns(): EsNamespace {
    return this.#ns;
  }

  isActive(): boolean {
    return this.#bundle.isActive();
  }

  spawn(init?: EsEmission.Init): EsEmission {
    return new SpawnedEsEmission(
      this.bundle,
      this.#state,
      new EsNamespace({ ...init?.ns, enclosing: this.ns }),
    );
  }

  span(...emitters: EsEmitter[]): EsEmission.Span {
    return this.#state[0].emit(this, ...emitters);
  }

  async whenDone(): Promise<void> {
    await this.bundle.whenDone();
  }

}

interface EsEmission$State {
  isActive(): boolean;
  emit(emission: EsEmission, ...emitters: EsEmitter[]): EsEmission.Span;
  done(): Promise<void>;
  whenDone(): Promise<void>;
}

class EsEmission$ActiveState implements EsEmission$State {

  readonly #change: (newState: EsEmission$State) => void;
  readonly #done = new PromiseResolver();
  readonly #resolver = new EveryPromiseResolver<unknown>(this.#done.whenDone());

  constructor(change: (newState: EsEmission$State) => void) {
    this.#change = change;
  }

  isActive(): boolean {
    return true;
  }

  emit(emission: EsEmission, ...emitters: EsEmitter[]): EsEmission.Span {
    const { add, whenDone } = new EveryPromiseResolver<string | EsPrinter>();

    let emit = (...emitters: EsEmitter[]): void => {
      add(...emitters.map(emitter => emitter.emit(emission)));
    };

    emit(...emitters);
    this.#resolver.add(whenDone());

    return {
      printer: {
        printTo: async out => {
          emit = () => {
            throw new TypeError('Code printed already');
          };

          const records = await whenDone();

          if (records.length) {
            out.print(...records);
          }
        },
      },
      emit(...emitters) {
        emit(...emitters);
      },
    };
  }

  async done(): Promise<void> {
    this.#done.resolve();
    this.#change(EsEmission$emittedState);

    return this.whenDone();
  }

  async whenDone(): Promise<void> {
    await this.#resolver.whenDone();
  }

}

class EsEmission$EmittedState implements EsEmission$State {

  isActive(): boolean {
    return false;
  }

  emit(_emission: EsEmission): never {
    throw new TypeError(`All code emitted already`);
  }

  async done(): Promise<void> {
    await this.whenDone();
  }

  whenDone(): Promise<void> {
    return Promise.resolve();
  }

}

const EsEmission$emittedState = /*#__PURE__*/ new EsEmission$EmittedState();
