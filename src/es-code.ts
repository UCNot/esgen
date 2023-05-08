import { EsPrintable, EsPrinter } from './es-printer.js';
import { EsEmitter, EsFragment, EsSource } from './es-source.js';
import { collectLines } from './impl/collect-lines.js';

export class EsCode implements EsEmitter {

  static get none(): EsSource {
    return EsCode$none;
  }

  readonly #parent: EsCode | undefined;
  readonly #parts: EsEmitter[] = [];
  #addPart: (part: EsEmitter) => void;

  constructor(parent?: EsCode) {
    this.#parent = parent;
    this.#addPart = this.#doAddPart;
  }

  #doAddPart(part: EsEmitter): void {
    this.#parts.push(part);
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

  async emit(): Promise<EsPrintable> {
    const extraRecords: (string | EsPrintable)[] = [];
    let whenEmitted: Promise<unknown> = Promise.resolve();

    this.#addPart = part => {
      this.#doAddPart(part);

      whenEmitted = Promise.all([
        whenEmitted,
        (async () => {
          extraRecords.push(await part.emit());
        })(),
      ]);
    };

    const records = await Promise.all(this.#parts.map(async part => await part.emit()));

    return Promise.resolve({
      printTo: async span => {
        this.#addPart = () => {
          throw new TypeError('Code printed already');
        };

        await whenEmitted;

        if (records.length) {
          span.print(...records);
        }
        if (extraRecords.length) {
          span.print(...extraRecords);
        }
      },
    });
  }

  async *lines(): AsyncIterableIterator<string> {
    yield* new EsPrinter().print(await this.emit()).lines();
  }

  async toLines(): Promise<string[]> {
    return await collectLines(this.lines());
  }

  async toText(): Promise<string> {
    const lines = await this.toLines();

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
