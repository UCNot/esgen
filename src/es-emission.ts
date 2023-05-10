import { EveryPromiseResolver, PromiseResolver } from '@proc7ts/async';
import { EsPrinter } from './es-output.js';

export class EsEmission {

  readonly #parent: EsEmission | undefined;
  readonly #state: [EsEmission$State];

  constructor(parent?: EsEmission) {
    this.#parent = parent;
    this.#state = parent
      ? parent.#state
      : [new EsEmission$ActiveState(newState => (this.#state[0] = newState))];
  }

  isActive(): boolean {
    return this.#state[0].isActive();
  }

  emit(...emitters: EsEmitter[]): EsEmission.Span {
    return this.#state[0].emit(this, ...emitters);
  }

  async done(): Promise<void> {
    if (!this.#parent) {
      await this.#state[0].done();
    }
  }

  async whenDone(): Promise<void> {
    await this.#state[0].whenDone();
  }

}

export namespace EsEmission {
  export interface Span {
    readonly result: EsPrinter;
    emit(this: void, ...emitters: EsEmitter[]): void;
  }
}

export interface EsEmitter {
  emit(emission: EsEmission): string | EsPrinter | PromiseLike<string | EsPrinter>;
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
      result: {
        printTo: async span => {
          emit = () => {
            throw new TypeError('Code printed already');
          };

          const records = await whenDone();

          if (records.length) {
            span.print(...records);
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
