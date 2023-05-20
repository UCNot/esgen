import { EveryPromiseResolver, PromiseResolver } from '@proc7ts/async';
import { lazyValue } from '@proc7ts/primitives';
import { EsDeclarations } from '../declarations/es-declarations.js';
import { EsCode } from '../es-code.js';
import { EsOutput, EsPrinter } from '../es-output.js';
import { EsSource } from '../es-source.js';
import { EsImports } from '../symbols/es-imports.js';
import { EsNamespace } from '../symbols/es-namespace.js';
import { EsBundleFormat } from './es-bundle-format.js';
import { EsEmissionSpan, EsEmitter, EsScope, EsScopeInit } from './es-scope.js';

/**
 * Emitted code bundle.
 *
 * A top-level emission {@link EsScope scope}. A code amitted in this scope supposed to be placed to the same bundle
 * (i.e. module, file, etc.).
 */
export class EsBundle implements EsScope {

  readonly #state: [EsScope$State];
  readonly #format: EsBundleFormat;
  readonly #imports: () => EsImports;
  readonly #declarations: () => EsDeclarations;
  readonly #ns: () => EsNamespace;

  /**
   * Constructs bundle.
   *
   * @param init - Bundle initialization options.
   */
  constructor(init?: EsBundleInit);
  constructor({
    format = EsBundleFormat.Default,
    ns = bundle => new EsNamespace(bundle, { comment: 'Bundle' }),
    imports = bundle => new EsImports(bundle),
    declarations = bundle => new EsDeclarations(bundle),
  }: EsBundleInit = {}) {
    this.#format = format;
    this.#ns = lazyValue(() => ns(this));
    this.#imports = lazyValue(() => imports(this));
    this.#declarations = lazyValue(() => declarations(this));
    this.#state = [new EsScope$ActiveState(newState => (this.#state[0] = newState))];
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

  get imports(): EsImports {
    return this.#imports();
  }

  get declarations(): EsDeclarations {
    return this.#declarations();
  }

  get ns(): EsNamespace {
    return this.#ns();
  }

  isActive(): boolean {
    return this.#state[0].isActive();
  }

  nest(init?: EsScopeInit): EsScope {
    return new NestedEsScope(this, this.#state, scope => this.ns.nest(scope, { ...init?.ns }));
  }

  span(...emitters: EsEmitter[]): EsEmissionSpan {
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
   * @param sources - Code sources to emit code from.
   *
   * @returns Bundling result in appropriate {@link format}.
   */
  emit(...sources: EsSource[]): EsBundleResult {
    const { printer } = this.span(
      new EsCode().write(
        this.imports,
        this.declarations.body,
        ...sources,
        this.declarations.exports,
      ),
    );

    this.done();

    const printBundle = lazyValue(() => this.#printBundle(printer));
    const asText = lazyValue(
      async (): Promise<string> => await new EsOutput().print(printBundle()).asText(),
    );

    return {
      printTo: out => {
        out.print(printBundle());
      },
      asText,
      asExports: lazyValue(this.#asExports(printBundle)),
    };
  }

  #printBundle(body: EsPrinter): EsPrinter {
    return {
      printTo: async out => {
        await this.whenDone();

        switch (this.format) {
          case EsBundleFormat.IIFE:
            out.print(this.#printIIFE(body));

            break;
          case EsBundleFormat.ES2015:
            out.print(body);
        }
      },
    };
  }

  #printIIFE(content: EsPrinter): EsPrinter {
    return {
      printTo: out => {
        out.inline(out => {
          out
            .print(`(async () => {`)
            .indent(out => out.print(content, ''))
            .print(`})()`);
        });
      },
    };
  }

  #asExports(printBundle: () => EsPrinter): () => Promise<unknown> {
    const { format } = this;

    if (format !== EsBundleFormat.IIFE) {
      return this.#doNotExport.bind(this);
    }

    return async () => await this.#returnExports(printBundle());
  }

  async #returnExports(bundle: EsPrinter): Promise<unknown> {
    const text = await new EsOutput().inline(out => out.print('return ', bundle, ';')).asText();

    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const factory = Function(text);

    return await factory();
  }

  #doNotExport(): Promise<never> {
    return Promise.reject(new TypeError(`Can not export from ${this.format} bundle`));
  }

}

/**
 * Initialization options for {@link EsBundle code bundle}.
 */
export interface EsBundleInit {
  /**
   * Format of the bundled code.
   *
   * @defaultValue {@link EsBundleFormat.Default}.
   */
  readonly format?: EsBundleFormat | undefined;

  /**
   * Bundle namespace factory.
   *
   * @defaultValue New namespace instance factory.
   */
  readonly ns?: ((this: void, bundle: EsBundle) => EsNamespace) | undefined;

  /**
   * Import declarations collection factory.
   *
   * @defaultValue New import declarations collection factory.
   */
  readonly imports?: ((this: void, bundle: EsBundle) => EsImports) | undefined;

  /**
   * Bundle declarations collection factory.
   *
   * @defaultValue New declarations collection factory.
   */
  readonly declarations?: ((this: void, bundle: EsBundle) => EsDeclarations) | undefined;
}

/**
 * Result of code {@link EsBundle#bundle bundling}.
 */
export interface EsBundleResult extends EsPrinter {
  /**
   * Represents bundled code as text.
   *
   * @returns Promise resolved to printed text.
   */
  asText(this: void): Promise<string>;

  /**
   * Represents bundled code as exports.
   *
   * Works only for {@link EsBundleFormat.IIFE IIFE} format.
   *
   * @returns Promise resolved to bundle exports.
   */
  asExports(): Promise<unknown>;
}

class NestedEsScope implements EsScope {

  readonly #bundle: EsBundle;
  readonly #state: [EsScope$State];
  readonly #ns: () => EsNamespace;

  constructor(bundle: EsBundle, state: [EsScope$State], ns: (scope: EsScope) => EsNamespace) {
    this.#bundle = bundle;
    this.#state = state;
    this.#ns = lazyValue(() => ns(this));
  }

  get bundle(): EsBundle {
    return this.#bundle;
  }

  get format(): EsBundleFormat {
    return this.bundle.format;
  }

  get imports(): EsImports {
    return this.bundle.imports;
  }

  get declarations(): EsDeclarations {
    return this.bundle.declarations;
  }

  get ns(): EsNamespace {
    return this.#ns();
  }

  isActive(): boolean {
    return this.bundle.isActive();
  }

  nest(init?: EsScopeInit): EsScope {
    return new NestedEsScope(this.bundle, this.#state, scope => this.ns.nest(scope, init?.ns));
  }

  span(...emitters: EsEmitter[]): EsEmissionSpan {
    return this.#state[0].span(this, ...emitters);
  }

  async whenDone(): Promise<void> {
    await this.bundle.whenDone();
  }

}

interface EsScope$State {
  isActive(): boolean;
  span(scope: EsScope, ...emitters: EsEmitter[]): EsEmissionSpan;
  done(): void;
  whenDone(): Promise<void>;
}

class EsScope$ActiveState implements EsScope$State {

  readonly #done = new PromiseResolver();
  readonly #resolver = new EveryPromiseResolver<unknown>(this.#done.whenDone());
  readonly whenDone: () => Promise<void>;

  constructor(change: (newState: EsScope$State) => void) {
    this.whenDone = lazyValue(async () => {
      try {
        await this.#resolver.whenDone();
      } finally {
        change(new EsScope$EmittedState(this.whenDone));
      }
    });
  }

  isActive(): boolean {
    return true;
  }

  span(scope: EsScope, ...emitters: EsEmitter[]): EsEmissionSpan {
    const { add, whenDone } = new EveryPromiseResolver<string | EsPrinter>();

    let emit = (...emitters: EsEmitter[]): void => {
      const emissions = emitters.map(async emitter => await emitter.emit(scope));

      add(...emissions);
      this.#resolver.add(...emissions);
    };

    emit(...emitters);

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

class EsScope$EmittedState implements EsScope$State {

  constructor(readonly whenDone: () => Promise<void>) {}

  isActive(): boolean {
    return false;
  }

  span(_scope: EsScope): never {
    throw new TypeError(`All code emitted already`);
  }

  done(): void {
    // Do nothing.
  }

}
