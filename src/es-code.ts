import { noop } from '@proc7ts/primitives';
import { EsOutput, EsPrinter } from './es-output.js';
import { EsBuilder, EsSource } from './es-source.js';
import { EsEmissionSpan, EsEmitter, EsScope, EsScopeInit } from './scopes/es-scope.js';

/**
 * Writable fragment of code.
 *
 * By default, represents a {@link multiLine multi-line} code, where each written code source is placed on a new line.
 * When {@link line inline}, the written code sources placed without new lines between them.
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
  readonly #spans = new Map<EsScope, EsEmissionSpan>();

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
   * Writes a new line without `sources` specified, unless this is an {@link line inline} code fragment.
   *
   * Places each source on a new line, unless this is an {@link line inline} code fragment.
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
        async emit(scope: EsScope): Promise<EsPrinter> {
          await source(code, scope);

          return code.emit(scope);
        },
      });
    } else if (isEsPrinter(source)) {
      if (source instanceof EsCode && source.#contains(this)) {
        throw new TypeError('Can not insert code fragment into itself');
      }
      this.#addEmitter(source);
    } else if (source === '') {
      this.#addEmitter(EsCode$NewLine);
    } else {
      this.#addEmitter(new EsCode$Record(source));
    }
  }

  #addEmitter(emitter: EsEmitter): void {
    this.#emitters.push(emitter);
    for (const { emit } of this.#spans.values()) {
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
   * Writes a line of code to this fragment.
   *
   * Unlike {@link multiLine}, the sources are placed on the same line.
   *
   * @param sources - Inline code sources.
   *
   * @returns `this` instance.
   */
  line(...sources: EsSource[]): this {
    this.#addEmitter(new EsCode$Line(new EsCode(this).write(...sources)));

    return this;
  }

  /**
   * Writes indented code to this fragment.
   *
   * Always places each source on a new line and prepends it with indentation symbols. Even when inside an
   * {@link line inline} code fragment.
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
   * Writes multiple lines of code to this fragment.
   *
   * Always places each source on a new line. Even when inside an {@link line inline} code fragment.
   * Unlike {@link indent}, does not adjust indentation.
   *
   * @param sources - Multi-line code sources.
   *
   * @returns `this` instance.
   */
  multiLine(...sources: EsSource[]): this {
    this.#addEmitter(new EsCode$Indented(new EsCode(this).write(...sources), ''));

    return this;
  }

  /**
   * Emits code in {@link EsScope#nest nested} scope and appends emission result to `this` fragment.
   *
   * @param builder - Code builder.
   *
   * @returns `this` instance.
   */
  scope(builder: EsBuilder): this;

  /**
   * Emits code in customized {@link EsScope#nest nested} scope and appends emission result to `this` fragment.
   *
   * @param init - Custom scope initialization options.
   * @param builder - Code builder.
   *
   * @returns `this` instance.
   */
  scope(init: EsScopeInit | undefined, builder: EsBuilder): this;

  scope(initOrBuilder: EsScopeInit | EsBuilder | undefined, builder?: EsBuilder): this {
    let init: EsScopeInit | undefined;

    if (builder) {
      init = initOrBuilder as EsScopeInit;
    } else {
      builder = initOrBuilder as EsBuilder;
    }

    return this.write((code, scope) => {
      code.write(new EsCode().write(builder!).emit(scope.nest(init)));
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
   * @param scope - Code emission scope.
   *
   * @returns Emitted code printer.
   */
  emit(scope: EsScope): EsPrinter {
    const existingSpan = this.#spans.get(scope);

    if (existingSpan) {
      return existingSpan.printer;
    }

    const span = scope.span(...this.#emitters);

    this.#spans.set(scope, span);

    scope
      .whenDone()
      .catch(noop)
      .finally(() => {
        this.#spans.delete(scope);
      });

    return span.printer;
  }

}

function isEsPrinter(source: EsSource): source is EsEmitter {
  return typeof source === 'object' && 'emit' in source && typeof source.emit === 'function';
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

class EsCode$Line implements EsEmitter {

  readonly #code: EsCode;

  constructor(code: EsCode) {
    this.#code = code;
  }

  emit(scope: EsScope): EsPrinter {
    const record = this.#code.emit(scope);

    return {
      printTo: out => {
        out.line(span => span.print(record));
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

  emit(scope: EsScope): EsPrinter {
    const printer = this.#code.emit(scope);

    return {
      printTo: span => {
        span.indent(out => out.print(printer), this.#indent);
      },
    };
  }

}
