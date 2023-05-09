import { EsEmission, EsEmitter } from './es-emission.js';
import { EsPrintable, EsPrinter } from './es-printer.js';
import { EsFragment, EsSource } from './es-source.js';
import { collectLines } from './impl/collect-lines.js';

export class EsCode implements EsEmitter {

  static get none(): EsSource {
    return EsCode$none;
  }

  readonly #parent: EsCode | undefined;
  readonly #parts: EsEmitter[] = [];
  readonly #emissions = new Map<EsEmission, EsEmission.Span>();

  constructor(parent?: EsCode) {
    this.#parent = parent;
  }

  #addPart(part: EsEmitter): void {
    this.#parts.push(part);
    for (const { emit } of this.#emissions.values()) {
      emit(part);
    }
  }

  write(...fragments: EsSource[]): this {
    if (fragments.length) {
      for (const fragment of fragments) {
        this.#addFragment(fragment);
      }
    } else {
      fragments.push(EsCode$NewLine);
    }

    return this;
  }

  #addFragment(fragment: EsSource): void {
    if (typeof fragment === 'function') {
      const code = new EsCode(this);

      this.#addPart({
        async emit(): Promise<EsPrintable> {
          await fragment(code);

          return await code.emit();
        },
      });
    } else if (isEsPrintable(fragment)) {
      if (fragment instanceof EsCode && fragment.#contains(this)) {
        throw new TypeError('Can not insert code fragment into itself');
      }
      this.#addPart(fragment);
    } else if (isEsFragment(fragment)) {
      this.#addFragment(fragment.toCode());
    } else if (fragment === '') {
      this.#addPart(EsCode$NewLine);
    } else {
      this.#addPart(new EsCode$Record(fragment));
    }
  }

  #contains(fragment: EsCode): boolean {
    for (;;) {
      if (fragment === this) {
        return true;
      }
      if (!fragment.#parent) {
        return false;
      }

      fragment = fragment.#parent;
    }
  }

  inline(...fragments: EsSource[]): this {
    this.#addPart(new EsCode$Inline(new EsCode(this).write(...fragments)));

    return this;
  }

  indent(...fragments: EsSource[]): this {
    this.#addPart(new EsCode$Indented(new EsCode(this).write(...fragments)));

    return this;
  }

  block(...fragments: EsSource[]): this {
    this.#addPart(new EsCode$Indented(new EsCode(this).write(...fragments), ''));

    return this;
  }

  async emit(emission?: EsEmission): Promise<EsPrintable> {
    let codeEmission: EsEmission;

    if (emission) {
      const existingSpan = this.#emissions.get(emission);

      if (existingSpan) {
        return existingSpan.result;
      }

      codeEmission = emission;
    } else {
      codeEmission = new EsEmission();
    }

    const span = codeEmission.emit(...this.#parts);

    this.#emissions.set(codeEmission, span);

    if (emission) {
      codeEmission.whenDone().finally(() => {
        this.#emissions.delete(codeEmission);
      });
    } else {
      await codeEmission.done().finally(() => {
        this.#emissions.delete(codeEmission);
      });
    }

    return span.result;
  }

  async *lines(emission?: EsEmission): AsyncIterableIterator<string> {
    yield* new EsPrinter().print(await this.emit(emission)).lines();
  }

  async toLines(emission?: EsEmission): Promise<string[]> {
    return await collectLines(this.lines(emission));
  }

  async toText(emission?: EsEmission): Promise<string> {
    const lines = await this.toLines(emission);

    return lines.join('');
  }

}

function isEsPrintable(source: EsSource): source is EsEmitter {
  return typeof source === 'object' && 'emit' in source && typeof source.emit === 'function';
}

function isEsFragment(source: EsSource): source is EsFragment {
  return typeof source === 'object' && 'toCode' in source && typeof source.toCode === 'function';
}

function EsCode$none(_code: EsCode): void {
  // No code.
}

class EsCode$Record implements EsEmitter {

  readonly #record: EsPrintable | string;

  constructor(record: EsPrintable | string) {
    this.#record = record;
  }

  emit(): string | EsPrintable {
    return this.#record;
  }

}

class EsCode$NewLine$ implements EsEmitter {

  emit(): this {
    return this;
  }

  printTo(lines: EsPrinter): void {
    lines.print();
  }

}

const EsCode$NewLine = /*#__PURE__*/ new EsCode$NewLine$();

class EsCode$Inline implements EsEmitter {

  readonly #code: EsCode;

  constructor(code: EsCode) {
    this.#code = code;
  }

  async emit(): Promise<EsPrintable> {
    const record = await this.#code.emit();

    return {
      printTo: span => {
        span.inline(span => span.print(record));
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

  async emit(): Promise<EsPrintable> {
    const record = await this.#code.emit();

    return {
      printTo: span => {
        span.indent(span => span.print(record), this.#indent);
      },
    };
  }

}
