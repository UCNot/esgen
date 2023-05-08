import { collectLines } from './impl/collect-lines.js';

export class EsPrinter implements EsPrintable {

  #indent = '';
  #nl = '\n';
  readonly #records: EsPrintRecord[] = [];

  print(...records: (string | EsPrintable)[]): this {
    if (records.length) {
      for (const record of records) {
        if (typeof record === 'string') {
          if (record) {
            this.#records.push([`${record}${this.#nl}`]);
          } else {
            this.#newLine();
          }
        } else {
          this.#records.push(this.#print(record));
        }
      }
    } else {
      this.#newLine();
    }

    return this;
  }

  #newLine(): void {
    if (this.#nl) {
      this.#records.push([this.#nl]);
    }
  }

  async #print(printable: EsPrintable): Promise<string[]> {
    const span = new EsPrinter();

    span.#nl = this.#nl;
    await printable.printTo(span);

    return await span.toLines();
  }

  inline(print: (span: EsPrinter) => void): this {
    const inline = new EsPrinter();

    inline.#nl = '';
    print(inline);
    this.print(inline);

    return this;
  }

  indent(print: (span: EsPrinter) => void, indent = '  '): this {
    const indented = new EsPrinter();

    indented.#indent = indent;
    print(indented);
    this.print(indented);

    return this;
  }

  printTo(span: EsPrinter): void {
    if (this.#records.length) {
      span.print({
        printTo: this.#printTo.bind(this),
      });
    }
  }

  async #printTo(span: EsPrinter): Promise<void> {
    span.#appendLines(await this.toLines(), this);
  }

  #appendLines(lines: string[], from: EsPrinter): void {
    if (!lines.length) {
      return;
    }

    const prefix = this.#indent + from.#indent;

    if (this.#nl) {
      // Insert into block.
      const lastLine = lines[lines.length - 1];

      if (!lastLine.endsWith('\n')) {
        // Add newline.
        lines[lines.length - 1] += this.#nl;
      }
    } else {
      // Insert into inline.
      if (from.#indent) {
        // Insert newline before indented code.
        this.#records.push([from.#nl]);
      }

      const lastLine = lines[lines.length - 1];

      if (lastLine.endsWith('\n')) {
        // Remove last newline.
        lines[lines.length - 1] = lastLine.slice(0, -1);
      }
    }

    this.#records.push(
      lines.map(line => (line && line !== '\n' ? `${prefix}${line}` : line) /* Do not indent NL */),
    );
  }

  async *lines(): AsyncIterableIterator<string> {
    const records = await Promise.all(this.#records);
    let prevNL = false;
    let lastLine = '';

    for (const lines of records) {
      for (const line of lines) {
        if (line !== '\n') {
          prevNL = false;
          lastLine += line;
          if (line.endsWith('\n')) {
            yield lastLine;
            lastLine = '';
          }
        } else if (!prevNL) {
          if (lastLine) {
            yield lastLine;
            lastLine = '';
          }
          yield line;
          prevNL = true;
        }
      }
    }

    if (lastLine) {
      yield lastLine;
    }
  }

  async toLines(): Promise<string[]> {
    return await collectLines(this.lines());
  }

  async toText(): Promise<string> {
    const lines = await this.toLines();

    return lines.join('');
  }

}

export interface EsPrintable {
  printTo(span: EsPrinter): void | PromiseLike<void>;
}

type EsPrintRecord = string[] | Promise<string[]>;
