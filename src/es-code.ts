import { EsBundle } from './emission/es-bundle.js';
import { EsEmission, EsEmitter } from './emission/es-emission.js';
import { EsOutput, EsPrinter } from './es-output.js';
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
        async emit(): Promise<EsPrinter> {
          await fragment(code);

          return await code.emit();
        },
      });
    } else if (isEsPrinter(fragment)) {
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

  async emit(emission?: EsEmission): Promise<EsPrinter>;
  async emit(explicitEmission?: EsEmission): Promise<EsPrinter> {
    let bundle: EsBundle | undefined;
    let emission: EsEmission;

    if (explicitEmission) {
      const existingSpan = this.#emissions.get(explicitEmission);

      if (existingSpan) {
        return existingSpan.printer;
      }

      emission = explicitEmission;
    } else {
      emission = bundle = new EsBundle();
    }

    const span = emission.span(...this.#parts);

    this.#emissions.set(emission, span);

    if (bundle) {
      await bundle.done().finally(() => {
        this.#emissions.delete(emission);
      });
    } else {
      emission.whenDone().finally(() => {
        this.#emissions.delete(emission);
      });
    }

    return span.printer;
  }

  async *lines(emission?: EsEmission): AsyncIterableIterator<string> {
    yield* new EsOutput().print(await this.emit(emission)).lines();
  }

  async toLines(emission?: EsEmission): Promise<string[]> {
    return await collectLines(this.lines(emission));
  }

  async toText(emission?: EsEmission): Promise<string> {
    const lines = await this.toLines(emission);

    return lines.join('');
  }

}

function isEsPrinter(source: EsSource): source is EsEmitter {
  return typeof source === 'object' && 'emit' in source && typeof source.emit === 'function';
}

function isEsFragment(source: EsSource): source is EsFragment {
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

  async emit(): Promise<EsPrinter> {
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

  async emit(): Promise<EsPrinter> {
    const record = await this.#code.emit();

    return {
      printTo: span => {
        span.indent(span => span.print(record), this.#indent);
      },
    };
  }

}
