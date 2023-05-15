import { noop } from '@proc7ts/primitives';
import { EsEmission, EsEmissionInit, EsEmissionSpan, EsEmitter } from './emission/es-emission.js';
import { EsOutput, EsPrinter } from './es-output.js';
import { EsBuilder, EsProducer, EsSource } from './es-source.js';

/**
 * Writable fragment of code.
 *
 * By default, represents a {@link block} of code, where each written code source is placed on a new line.
 * When {@link inline}, the written code sources placed without new lines between them.
 */
export class EsCode implements EsEmitter {

  /**
   * Source of no code.
   */
  static get none(): EsSource {
    return EsCode$none;
  }

  readonly #enclosing: EsCode | undefined;
  readonly #emitters: EsEmitter[] = [];
  readonly #emissions = new Map<EsEmission, EsEmissionSpan>();

  /**
   * Constructs code fragment.
   *
   * @param enclosing - Enclosing code fragment. Used to prevent inserting code fragments into themselves.
   */
  constructor(enclosing?: EsCode) {
    this.#enclosing = enclosing;
  }

  /**
   * Writes code to this fragment.
   *
   * Writes a new line without `sources` specified, unless this is an {@link inline} code fragment.
   *
   * Places each source on a new line, unless this is an {@link inline} code fragment.
   *
   * @param sources - Written code sources.
   *
   * @returns `this` instance.
   */
  write(...sources: EsSource[]): this {
    if (sources.length) {
      for (const source of sources) {
        this.#addSource(source);
      }
    } else {
      sources.push(EsCode$NewLine);
    }

    return this;
  }

  #addSource(source: EsSource): void {
    if (typeof source === 'function') {
      const code = new EsCode(this);

      this.#addEmitter({
        async emit(emission: EsEmission): Promise<EsPrinter> {
          await source(code, emission);

          return code.emit(emission);
        },
      });
    } else if (isEsPrinter(source)) {
      if (source instanceof EsCode && source.#contains(this)) {
        throw new TypeError('Can not insert code fragment into itself');
      }
      this.#addEmitter(source);
    } else if (isEsProducer(source)) {
      this.#addSource(source.toCode());
    } else if (source === '') {
      this.#addEmitter(EsCode$NewLine);
    } else {
      this.#addEmitter(new EsCode$Record(source));
    }
  }

  #addEmitter(emitter: EsEmitter): void {
    this.#emitters.push(emitter);
    for (const { emit } of this.#emissions.values()) {
      emit(emitter);
    }
  }

  #contains(other: EsCode): boolean {
    for (;;) {
      if (other === this) {
        return true;
      }
      if (!other.#enclosing) {
        return false;
      }

      other = other.#enclosing;
    }
  }

  /**
   * Writes inline code to this fragment.
   *
   * Unlike {@link write}, the sources are placed on the same line.
   *
   * @param sources - Inline code sources.
   *
   * @returns `this` instance.
   */
  inline(...sources: EsSource[]): this {
    this.#addEmitter(new EsCode$Inline(new EsCode(this).write(...sources)));

    return this;
  }

  /**
   * Writes indented code to this fragment.
   *
   * Always places each source on a new line, and prepends it with indentation symbols. Even for {@link inline}
   * code fragment.
   *
   * Indentations may be nested. Nested indentations adjust enclosing ones.
   *
   * @param sources - Indented code sources.
   *
   * @returns `this` instance.
   */
  indent(...sources: EsSource[]): this {
    this.#addEmitter(new EsCode$Indented(new EsCode(this).write(...sources)));

    return this;
  }

  /**
   * Writes block of code to this fragment.
   *
   * Always places each source on a new line. Even for {@link inline} code fragment. Unlike {@link indent}, does not
   * adjust indentation.
   *
   * @param sources - Block code sources.
   *
   * @returns `this` instance.
   */
  block(...sources: EsSource[]): this {
    this.#addEmitter(new EsCode$Indented(new EsCode(this).write(...sources), ''));

    return this;
  }

  /**
   * Emits code under {@link EsEmission#spawn spawned} emission control and appends emission result to this fragment.
   *
   * @param builder - Code builder.
   *
   * @returns `this` instance.
   */
  scope(builder: EsBuilder): this;

  /**
   * Emits code under emission control {@link EsEmission#spawn spawned} with custom options and appends emission result
   * to this fragment.
   *
   * @param init - Custom scope emission options.
   * @param builder - Code builder.
   *
   * @returns `this` instance.
   */
  scope(init: EsEmissionInit | undefined, builder: EsBuilder): this;

  scope(initOrBuilder: EsEmissionInit | EsBuilder | undefined, builder?: EsBuilder): this {
    let init: EsEmissionInit | undefined;

    if (builder) {
      init = initOrBuilder as EsEmissionInit;
    } else {
      builder = initOrBuilder as EsBuilder;
    }

    return this.write((code, emission) => {
      code.write(new EsCode().write(builder!).emit(emission.spawn(init)));
    });
  }

  /**
   * Emits the written code.
   *
   * It is possible to {@link write} more code until emitted code is not printed. It is an error to write the once the
   * code printing started.
   *
   * It is possible to issue multiple code emissions at the same time.
   *
   * @param emission - Code emission control.
   *
   * @returns Emitted code printer.
   */
  emit(emission: EsEmission): EsPrinter {
    const existingSpan = this.#emissions.get(emission);

    if (existingSpan) {
      return existingSpan.printer;
    }

    const span = emission.span(...this.#emitters);

    this.#emissions.set(emission, span);

    emission
      .whenDone()
      .catch(noop)
      .finally(() => {
        this.#emissions.delete(emission);
      });

    return span.printer;
  }

}

function isEsPrinter(source: EsSource): source is EsEmitter {
  return typeof source === 'object' && 'emit' in source && typeof source.emit === 'function';
}

function isEsProducer(source: EsSource): source is EsProducer {
  return typeof source === 'object' && 'toCode' in source && typeof source.toCode === 'function';
}

function EsCode$none(_code: EsCode): void {
  // No code.
}

class EsCode$Record implements EsEmitter {

  readonly #record: EsPrinter | string;

  constructor(record: EsPrinter | string) {
    this.#record = record;
  }

  emit(): string | EsPrinter {
    return this.#record;
  }

}

class EsCode$NewLine$ implements EsEmitter {

  emit(): this {
    return this;
  }

  printTo(lines: EsOutput): void {
    lines.print();
  }

}

const EsCode$NewLine = /*#__PURE__*/ new EsCode$NewLine$();

class EsCode$Inline implements EsEmitter {

  readonly #code: EsCode;

  constructor(code: EsCode) {
    this.#code = code;
  }

  emit(emission: EsEmission): EsPrinter {
    const record = this.#code.emit(emission);

    return {
      printTo: out => {
        out.inline(span => span.print(record));
      },
    };
  }

}

class EsCode$Indented implements EsEmitter {

  readonly #code: EsCode;
  readonly #indent: string | undefined;

  constructor(code: EsCode, indent?: string) {
    this.#code = code;
    this.#indent = indent;
  }

  emit(emission: EsEmission): EsPrinter {
    const printer = this.#code.emit(emission);

    return {
      printTo: span => {
        span.indent(out => out.print(printer), this.#indent);
      },
    };
  }

}
