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
    return this.#state[0].span(this, ...emitters);
  }

  async whenDone(): Promise<void> {
    await this.#state[0].whenDone();
  }

  /**
   * Signals code bundling to stop.
   *
   * Invoke {@link whenDone} to wait for bundling to complete.
   *
   * @returns `this` instance.
   */
  done(): this {
    this.#state[0].done();

    return this;
  }

  /**
   * Bundles emitted code.
   *
   * Signals code bundling to {@link done stop}.
   *
   * @param emitters - Code emitters.
   *
   * @returns Bundling result in appropriate {@link format}.
   */
  emit(...emitters: EsEmitter[]): EsBundle.Result {
    const { printer } = this.span(...emitters);

    this.done();

    const toText = lazyValue(
      async (): Promise<string> => await new EsOutput().print(await this.#printBundle(printer)).toText(),
    );
    const printBundle = lazyValue(async () => await this.#printBundle(printer));

    return {
      printTo: async out => {
        out.print(await printBundle());
      },
      toText,
      toExports: lazyValue(this.#toExports(toText)),
    };
  }

  async #printBundle(body: EsPrinter): Promise<EsPrinter> {
    await this.whenDone();

    const content = this.#printContent(body);

    switch (this.format) {
      case EsBundleFormat.IIFE:
        return this.#printIIFE(content);
      case EsBundleFormat.ES2015:
        return content;
    }
  }

  #printContent(body: EsPrinter): EsPrinter {
    return {
      printTo: out => {
        // TODO Add imports here.
        // TODO Add declarations here.
        out.print(body);
        // TODO Add exports here.
      },
    };
  }

  #printIIFE(content: EsPrinter): EsPrinter {
    return {
      printTo: out => {
        out.inline(out => {
          out
            .print(`(async () => {`)
            .indent(out => out.print(content, /* TODO Add exports instead */ 'return {};', ''))
            .print('', `})()`);
        });
      },
    };
  }

  #toExports(toText: () => Promise<string>): () => Promise<Record<string, unknown>> {
    const { format } = this;

    if (format !== EsBundleFormat.IIFE) {
      return this.#doNotExport.bind(this);
    }

    return async () => await this.#returnExports(toText);
  }

  async #returnExports(toText: () => Promise<string>): Promise<Record<string, unknown>> {
    const text = await toText();

    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const factory = Function(`return ${text.slice(0, -1)};`) as () => Promise<
      Record<string, unknown>
    >;

    return await factory();
  }

  #doNotExport(): Promise<never> {
    return Promise.reject(new TypeError(`Can not export from ${this.format} bundle`));
  }

}

export namespace EsBundle {
  /**
   * Initialization options for bundle emission.
   */
  export interface Init {
    /**
     * Format of the bundled code.
     *
     * @defaultValue {@link EsBundleFormat.Default}.
     */
    readonly format?: EsBundleFormat | undefined;

    /**
     * Top-level namespace to use.
     *
     * @defaultValue New namespace instance.
     */
    readonly ns?: EsNamespace | undefined;
  }

  /**
   * Result of code {@link EsBundle#bundle bundling}.
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
    return this.#state[0].span(this, ...emitters);
  }

  async whenDone(): Promise<void> {
    await this.bundle.whenDone();
  }

}

interface EsEmission$State {
  isActive(): boolean;
  span(emission: EsEmission, ...emitters: EsEmitter[]): EsEmission.Span;
  done(): void;
  whenDone(): Promise<void>;
}

class EsEmission$ActiveState implements EsEmission$State {

  readonly #done = new PromiseResolver();
  readonly #resolver = new EveryPromiseResolver<unknown>(this.#done.whenDone());
  readonly whenDone: () => Promise<void>;

  constructor(change: (newState: EsEmission$State) => void) {
    this.whenDone = lazyValue(async () => {
      try {
        await this.#resolver.whenDone();
      } finally {
        change(new EsEmission$EmittedState(this.whenDone));
      }
    });
  }

  isActive(): boolean {
    return true;
  }

  span(emission: EsEmission, ...emitters: EsEmitter[]): EsEmission.Span {
    const { add, whenDone } = new EveryPromiseResolver<string | EsPrinter>();

    let emit = (...emitters: EsEmitter[]): void => {
      add(...emitters.map(async emitter => await emitter.emit(emission)));
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

  done(): void {
    this.#done.resolve();
  }

}

class EsEmission$EmittedState implements EsEmission$State {

  constructor(readonly whenDone: () => Promise<void>) {}

  isActive(): boolean {
    return false;
  }

  span(_emission: EsEmission): never {
    throw new TypeError(`All code emitted already`);
  }

  done(): void {
    // Do nothing.
  }

}
