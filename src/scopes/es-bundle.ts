import { EveryPromiseResolver, PromiseResolver } from '@proc7ts/async';
import { lazyValue } from '@proc7ts/primitives';
import { EsPrinter } from '../code/es-output.js';
import { EsDeclarations } from '../declarations/es-declarations.js';
import { EsGenerationOptions } from '../es-generate.js';
import { EsImports } from '../symbols/es-imports.js';
import { EsNamespace } from '../symbols/es-namespace.js';
import { EsBundleFormat } from './es-bundle-format.js';
import { EsEmissionSpan, EsEmitter, EsScope, EsScopeInit, EsScopeKind } from './es-scope.js';
import { EsScopedValueKey } from './es-scoped-value-key.js';

/**
 * Emitted code bundle.
 *
 * A top-level emission {@link EsScope scope}. Code emitted in this scope supposed to be placed to the same bundle
 * (i.e. module, file, etc.).
 */
export class EsBundle implements EsScope {

  readonly #state: [EsScope$State];
  readonly #store: EsScope$Store;
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
    this.#state = [new EsScope$ActiveState(newState => (this.#state[0] = newState))];
    this.#store = new EsScope$Store(this);
    this.#format = format;
    this.#ns = lazyValue(() => ns(this));
    this.#imports = lazyValue(() => imports(this));
    this.#declarations = lazyValue(() => declarations(this));
  }

  /**
   * Always refers to itself.
   */
  get bundle(): this {
    return this;
  }

  /**
   * Always refers to itself.
   */
  get enclosing(): this {
    return this;
  }

  /**
   * Always refers to itself.
   */
  get functionOrBundle(): this {
    return this;
  }

  get kind(): EsScopeKind.Bundle {
    return EsScopeKind.Bundle;
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

  isAsync(): true {
    return true;
  }

  isGenerator(): false {
    return false;
  }

  isActive(): boolean {
    return this.#state[0].isActive();
  }

  get<T>(key: EsScopedValueKey<T>): T {
    return this.#store.get(key);
  }

  nest(init?: EsScopeInit): EsScope {
    return new NestedEsScope(this, this.#state, init, scope => this.ns.nest(scope, { ...init?.ns }));
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

}

/**
 * Initialization options for {@link EsBundle code bundle}.
 */
export type EsBundleInit = EsGenerationOptions;

class NestedEsScope implements EsScope {

  readonly #bundle: EsBundle;
  readonly #enclosing: EsScope;
  readonly #state: [EsScope$State];
  readonly #store: EsScope$Store;
  readonly #kind: EsScopeKind;
  readonly #async: boolean;
  readonly #generator: boolean;
  readonly #ns: () => EsNamespace;

  constructor(
    enclosing: EsScope,
    state: [EsScope$State],
    { kind = EsScopeKind.Block, async, generator }: EsScopeInit = {},
    ns: (scope: EsScope) => EsNamespace,
  ) {
    this.#enclosing = enclosing;
    this.#bundle = enclosing.bundle;
    this.#state = state;
    this.#store = new EsScope$Store(this);
    this.#kind = kind;
    if (kind === EsScopeKind.Function) {
      this.#async = async ?? false;
      this.#generator = generator ?? false;
    } else {
      this.#async = enclosing.isAsync();
      this.#generator = enclosing.isGenerator();
    }
    this.#ns = lazyValue(() => ns(this));
  }

  get kind(): EsScopeKind {
    return this.#kind;
  }

  get bundle(): EsBundle {
    return this.#bundle;
  }

  get enclosing(): EsScope {
    return this.#enclosing;
  }

  get functionOrBundle(): EsScope {
    return this.#kind === EsScopeKind.Function ? this : this.enclosing.functionOrBundle;
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

  isAsync(): boolean {
    return this.#async;
  }

  isGenerator(): boolean {
    return this.#generator;
  }

  isActive(): boolean {
    return this.bundle.isActive();
  }

  get<T>(key: EsScopedValueKey<T>): T {
    return this.#store.get(key);
  }

  nest(init?: EsScopeInit): EsScope {
    return new NestedEsScope(this, this.#state, init, scope => this.ns.nest(scope, init?.ns));
  }

  span(...emitters: EsEmitter[]): EsEmissionSpan {
    return this.#state[0].span(this, ...emitters);
  }

  async whenDone(): Promise<void> {
    await this.bundle.whenDone();
  }

}

class EsScope$Store {

  readonly #scope: EsScope;
  readonly #values = new Map<EsScopedValueKey<unknown>, () => unknown>();

  constructor(scope: EsScope) {
    this.#scope = scope;
  }

  get<T>(key: EsScopedValueKey<T>): T {
    const found = this.#values.get(key) as (() => T) | undefined;

    if (found) {
      return found();
    }

    const factory = lazyValue(() => key.esScopedValue(this.#scope));

    this.#values.set(key, factory);

    return factory();
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
